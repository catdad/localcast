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
        resource: status.media ? status.media.contentId : undefined,
        duration: status.media ? status.media.duration : 0,
        currentTime: status.currentTime,
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
        if (!list) {
            list = chromecasts();
        }

        if (list.players && list.players.length) {
            return resolve(players());
        }

        var onUpdate = _.debounce(_.once(function () {
            resolve(players());
        }), 100);

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
            player.play(body.file.resource, {
                type: 'video/mp4',
                title: body.file.name
            }, function (err, status) {
                if (err) {
                    return reject(err);
                }

                return resolve(cleanStatus(status));
            });

            player.on('error', function (err) {
                return reject(err);
            });
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
