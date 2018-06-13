/* jshint node: true */
/* global Promise */

var chromecasts = require('chromecasts');
var ns = require('node-stream');
var _ = require('lodash');

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
        _raw: status
    };
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

        setTimeout(function () {
            done(new Error('the query timed out'));
        }, 1000);

        // TODO if there are no devices, this will never resolve,
        // since update only fires when devices are discovered
        list.on('update', onUpdate);
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

function status(body) {
    return findPlayer(body.player).then(function (player) {
        return promisify(player.status.bind(player))().then(function (status) {
            if (!status) {
                return Promise.resolve({
                    state: 'NO_MEDIA'
                });
            }

            return Promise.resolve(cleanStatus(status));
        });
    });
}

function execCommand(body, func) {
    return findPlayer(body.player).then(function (player) {
        return status(body).then(function () {
            return func(player);
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
    return execCommand(body, function (player) {
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
            error: err.toString()
        }));
    });
};
