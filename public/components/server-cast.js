/* jshint browser: true, devel: true */        
/* globals request, hash, chromecast, server, toast */

(function (window) {
    var STATE = window.STATE;
    
    function discover(done) {
        request({
            method: 'POST',
            url: '/cast',
            body: JSON.stringify({
                command: 'discover'
            })
        }, function (err, body, res) {
            if (typeof body === 'string') {
                body = JSON.parse(body);
            }
            
            done(err, body);
        });
    }
    
    function play(file, player, done) {
        request({
            method: 'POST',
            url: '/cast',
            body: JSON.stringify({
                command: 'play',
                file: {
                    name: file.name,
                    path: file.path,
                    resource: file.resource,
                    thumb: file.thumb
                },
                player: player
            })
        }, function (err, body, res) {
            if (done) {
                return done(err, body);
            }
            
            if (err) {
                console.error(err);
            }
        });
    }
    
    STATE.on('servercast:play', function (file) {
        discover(function (err, list) {
            if (err) {
                return toast.error(err.message);
            }
            
            list.forEach(function (name) {
                toast.log({
                    message: name,
                    timeout: -1,
                    onclick: function () {
                        toast.clear();
                        
                        play(file, name);
                    }
                });
            });
        });
    });
}(window));
