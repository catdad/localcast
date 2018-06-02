/* jshint browser: true, devel: true */
/* globals request, hash, chromecast, server, toast */

(function (window) {
    var STATE = window.STATE;

    function noop() {
        console.log.apply(console, arguments);
    }

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

    function pause(player, done) {
        castReq({
            command: 'pause',
            player: player
        }, done);
    }

    function resume(player, done) {
        castReq({
            command: 'resume',
            player: player
        }, done);
    }

    function addTempControls(player) {
        toast.info({
            message: 'ctrl:',
            timeout: -1,
            dismissible: false,
            action: [{
                name: 'status',
                onclick: status.bind(null, player, noop)
            }, {
                name: 'pause',
                onclick: pause.bind(null, player, noop)
            }, {
                name: 'resume',
                onclick: resume.bind(null, player, noop)
            }]
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

                        addTempControls(name);
                    }
                });
            });
        });
    });
}(window));
