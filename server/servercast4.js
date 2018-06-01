/* jshint node: true */

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
    });
}

function play(file, name) {
    return discover().then(function (players) {
        var player = _.find(list.players, function (player) {
            return player.name === name;
        });
        
        if (!player) {
            return Promise.reject(name + ' not found');    
        }
        
        return new Promise(function (resolve, reject) {
            player.play(file.resource, {
                type: 'video/mp4',
                title: file.name
            }, function (err) {
                if (err) {
                    return reject(err);
                }
                
                return resolve();
            });    
        });
    });
}

module.exports = function (req, res) {
    parseJson(req).then(function (body) {
        switch (body.command) {
            case 'play':
                return play(body.file, body.player);
            case 'discover':
                return discover();
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
        
        console.log('returning 500 error');
        
        res.writeHead(500);
        res.end(JSON.stringify({
            error: err.toString()
        }));
    });
};
