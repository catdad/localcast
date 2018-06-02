/* jshint browser: true, devel: true */        
/* globals request, hash, chromecast, server, toast */

(function (window) {
    var STATE = window.STATE;
    
    function castReq(body, done) {
        request.json({
            method: 'POST',
            url: '/cast',
            body: JSON.stringify(body),
            headers: {
                'content-type': 'application/json'
            }
        }, function (err, body) {
            if (err) {
                return done(err);
            }
            
            return done(null, body);
        });
    }
    
    function discover(done) {
        castReq({
            command: 'discover'
        }, function (err, body, res) {
            if (err) {
                return done(err);
            }
            
            return done(null, body.players);
        });
    }
    
    function play(file, player, done) {
        castReq({
            command: 'play',
            file: {
                name: file.name,
                path: file.path,
                resource: file.resource,
                thumb: file.thumb
            },
            player: player
        }, function (err, body) {
            if (done) {
                return done(err, body);
            }
            
            if (err) {
                console.error(err);
            }
        });
    }
    
    function status(player, done) {
        castReq({
            command: 'status',
            player: player
        }, function (err, body) {
            console.log(err, body);
        });
    }
    
    STATE.on('servercast:play', function (file) {
        toast.clear();
        
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
