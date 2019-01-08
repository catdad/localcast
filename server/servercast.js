/* jshint node: true */
/* global Promise */

var chromecasts = require('chromecasts');
var ns = require('node-stream');
var _ = require('lodash');

var client = require('./servercast-client.js');

var list;

function parseJson(stream) {
    return new Promise(function (resolve, reject) {
        stream
            .on('error', reject)
            .pipe(ns.wait.json())
            .once('data', resolve)
            .on('data', function () {});
    });
}

function promisify(func) {
    return function () {
        var args = [].slice.call(arguments);

        return new Promise(function (resolve, reject) {
            args.push(function (err, data) {
                if (err) {
                    return reject(err);
                }

                return resolve(data);
            });

            try {
                func.apply(null, args);
            } catch(e) {
                reject(e);
            }
        });
    };
}

function cleanStatus(status) {
    return {
        state: status.playerState,
        resource: _.get(status, 'media.contentId', undefined),
        duration: _.get(status, 'media.duration', 0),
        currentTime: status.currentTime,
        title: _.get(status, 'media.metadata.title', undefined),
        isDefaultReceiver: true,
        _raw: status
    };
}

function cleanSession(session) {
    return {
        app: session.displayName,
        info: session.statusText,
        isIdleScreen: session.isIdleScreen,
        isDefaultReceiver: session.isDefaultReceiver,
        state: 'NO_MEDIA',
        _raw: session
    };
}

function handleErrors(player) {
    player.on('error', function (err) {
        console.log('player % error', player.name);
        console.log(err);
    });
}

function discover() {
    function players() {
        return {
            players: list.players.map(function (player) {
                return player.name;
            })
        };
    }

    return new Promise(function (resolve, reject) {
        var done = _.once(function (err, result) {
            if (err) {
                return reject(err);
            }

            return resolve(result);
        });

        if (!list) {
            list = chromecasts();
        }

        if (list.players && list.players.length) {
            return done(null, players());
        }

        var onUpdate = _.debounce(_.once(function () {
            done(null, players());
        }), 100);

        var onEachUpdate = function (player) {
            handleErrors(player);
            onUpdate(player);
        };

        // set a timeout to handle not finding any devices
        // note: I checked chromecasts lib, and it seems that
        // due to the use of node-ssdp, which has no callback
        // on search, there isn't a really good way to add
        // a callback to the update method
        setTimeout(function () {
            done(new Error('the query timed out'));
        }, 1000);

        list.on('update', onEachUpdate);
        list.update();
    });
}

function findPlayer(name) {
    return discover().then(function (players) {
        var player = _.find(list.players, function (player) {
            return player.name === name;
        });

        if (!player) {
            return Promise.reject(name + ' not found');
        }

        return Promise.resolve(player);
    });
}

function play(body) {
    return findPlayer(body.player).then(function (player) {
        return new Promise(function (resolve, reject) {
            function onErr(err) {
                player.removeListener('error', onErr);

                reject(err);
            }

            player.play(body.file.resource, {
                type: 'video/mp4',
                title: body.file.name
            }, function (err, status) {
                if (err) {
                    return onErr(err);
                }

                return resolve(cleanStatus(status));
            });

            player.on('error', onErr);
        });
    });
}

function session(body) {
    return findPlayer(body.player).then(function (player) {
        return client.sessions(player.host);
    }).then(function (sessions) {
        if (sessions.length) {
            return Promise.resolve(cleanSession(sessions[0]));
        }

        return Promise.reject('did not find session');
    });
}

function status(body) {
    return session(body).then(function (session) {
        // if the default player is not already open,
        // do not open it, something else might be
        // playing and it will get interrupted
        if (!session.isDefaultReceiver) {
            return session;
        }

        // the default media player is open, so
        // we can connect to the existing session
        // and start controlling it
        return findPlayer(body.player).then(function (player) {
            return promisify(player.status.bind(player))().then(function (status) {
                if (!status) {
                    return Promise.resolve(session);
                }

                var response = cleanStatus(status);
                response._rawSession = session._raw;

                return Promise.resolve(response);
            });
        });
    });
}

function execCommand(body, func) {
    return findPlayer(body.player).then(function (player) {
        return status(body).then(function (session) {
            return func(player, session);
        });
    }).then(function (status) {
        return Promise.resolve(cleanStatus(status));
    });
}

function pause(body) {
    return execCommand(body, function (player) {
        return promisify(player.pause.bind(player))();
    });
}

function resume(body) {
    return execCommand(body, function (player) {
        return promisify(player.resume.bind(player))();
    });
}

function seek(body) {
    return execCommand(body, function (player) {
        return promisify(player.seek.bind(player))(body.seconds);
    });
}

function stop(body) {
    return execCommand(body, function (player, session) {
        if (!session.isDefaultReceiver) {
            // we are already stopped, do nothing
            return status(body);
        }

        return promisify(player.stop.bind(player))();
    });
}

module.exports = function (req, res) {
    parseJson(req).then(function (body) {
        switch (body.command) {
            case 'play':
                return play(body);
            case 'discover':
                return discover(body);
            case 'session':
                return session(body);
            case 'status':
                return status(body);
            case 'pause':
                return pause(body);
            case 'resume':
                return resume(body);
            case 'stop':
                return stop(body);
            case 'seek':
                return seek(body);
        }

        return Promise.reject('invalid command provided');
    }).then(function (obj) {
        if (obj) {
            res.write(JSON.stringify(obj));
        } else {
            res.write('{}');
        }

        res.end();
    }).catch(function (err) {
        console.error(err);

        res.writeHead(500);
        res.end(JSON.stringify({
            error: err.message || err.toString()
        }));
    });
};
