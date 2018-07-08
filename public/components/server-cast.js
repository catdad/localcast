/* jshint browser: true, devel: true */
/* globals request, hash, chromecast, server, toast */

(function (window) {
    var STATE = window.STATE;

    function noop() {
        console.log.apply(console, arguments);
    }

    function showErr(err) {
        toast.error(err.toString());
    }

    function getRequestErr(err, res) {
        if (res && res.responseText && res.responseText.length) {
            try {
                var body = JSON.parse(res.responseText);

                if (body.error) {
                    return new Error(body.error);
                }
            } catch(e) { }
        }

        return err;
    }

    function castReq(body, done) {
        request.json({
            method: 'POST',
            url: '/cast',
            body: JSON.stringify(body),
            headers: {
                'content-type': 'application/json'
            }
        }, function (err, body, res) {
            if (err) {
                return done(getRequestErr(err, res));
            }

            return done(null, body);
        });
    }

    function discover(done) {
        castReq({
            command: 'discover'
        }, function (err, body) {
            if (err) {
                return done(err);
            }

            return done(null, body.players);
        });
    }

    function discoverUserSelect(done) {
        discover(function (err, list) {
            if (err) {
                return done(err);
            }

            list.forEach(function (name) {
                toast.log({
                    message: name,
                    timeout: -1,
                    onclick: function () {
                        toast.clear();

                        done(null, name);
                    }
                });
            });
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
        }, done);
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

    function stop(player, done) {
        castReq({
            command: 'stop',
            player: player
        }, done);
    }

    function seek(player, seconds, done) {
        castReq({
            command: 'seek',
            player: player,
            seconds: seconds
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

    function createClientStatus(status) {
        return {
            title: status.title || 'unknown media',
            state: status.state.toLowerCase(),
            duration: status.duration,
            currentTime: status.currentTime,
            isDefaultReceiver: status.isDefaultReceiver,
            isIdleScreen: status.isIdleScreen,
            app: status.app
        };
    }

    function onStatusCallback(err, status) {
        if (err) {
            return showErr(err);
        }

        STATE.emit('controls:update', createClientStatus(status));
    }

    var controls = {
        _player: null,
        _duration: 0,
        setPlayer: function (player) {
            controls._player = player;

            if (player === null) {
                return STATE.emit('cast:disconnected');
            }

            return STATE.emit('cast:connected', { name: player });
        },
        activePlayer: function (done) {
            if (controls._player) {
                return done(null, controls._player);
            }

            discoverUserSelect(done);
        },
        play: function () {
            resume(controls._player, onStatusCallback);
        },
        pause: function () {
            pause(controls._player, onStatusCallback);
        },
        stop: function () {
            stop(controls._player, onStatusCallback);
        },
        mute: function () {
            toast.error('mute not implemented');
        },
        unmute: function () {
            toast.error('unmute not implemented');
        },
        seek: function (ev) {
            var seconds = controls._duration * ev.percent;
            seek(controls._player, seconds, onStatusCallback);
        },
        status: function () {
            status(controls._player, onStatusCallback);
        },
        connect: function () {
            controls.activePlayer(function (err, player) {
                if (err) {
                    return showErr(err);
                }

                controls.setPlayer(player);

                status(player, function (err, status) {
                    if (err) {
                        return onStatusCallback(err);
                    }

                    var clientStatus = createClientStatus(status);

                    console.log(clientStatus);

                    switch(true) {
                        case !clientStatus.isDefaultReceiver && !clientStatus.isIdleScreen:
                            // some other app is playing
                            return toast.warning('currently playing ' + clientStatus.app);
                        case clientStatus.state === 'no_media':
                        case clientStatus.isIdleScreen:
                            // default receiver has no media or we are
                            // on the idle screen
                            return toast.info('nothing is playing');
                    }

                    // the default media receiver is playing something, so
                    // let's init controls
                    initPlay(status);

                    if (clientStatus && clientStatus.title) {
                        toast.info('playing: ' + clientStatus.title);
                    }

                    onStatusCallback(null, status);
                });
            });
        },
        disconnect: function () {
            function clear() {
                toast.clear();
            }

            toast.alert({
                message: 'disconnect from ' + controls._player + '?',
                timeout: -1
            });
            toast.log({
                message: 'yes',
                onclick: function () {
                    controls.setPlayer(null);
                    clear();
                },
                timeout: -1
            });
            toast.log({
                message: 'no',
                onclick: function () {
                    clear();
                },
                timeout: -1
            });
        }
    };

    function initAlwaysOnControls() {
        STATE.on('controls:connect', controls.connect);
        STATE.on('controls:disconnect', controls.disconnect);
    }

    function initControls() {
        STATE.on('controls:status', controls.status);
        STATE.on('controls:play', controls.play);
        STATE.on('controls:pause', controls.pause);
        STATE.on('controls:stop', controls.stop);
        STATE.on('controls:mute', controls.mute);
        STATE.on('controls:unmute', controls.unmute);
        STATE.on('controls:seek', controls.seek);
    }

    function destroyControls() {
        STATE.off('controls:status', controls.status);
        STATE.off('controls:play', controls.play);
        STATE.off('controls:pause', controls.pause);
        STATE.off('controls:stop', controls.stop);
        STATE.off('controls:mute', controls.mute);
        STATE.off('controls:unmute', controls.unmute);
        STATE.off('controls:seek', controls.seek);
    }

    function initPlay(status) {
        destroyControls();
        initControls();

        controls._duration = status.duration;

        STATE.emit('controls:init', createClientStatus(status));
    }

    initAlwaysOnControls();

    STATE.on('servercast:play', function (file) {
        toast.clear();

        controls.activePlayer(function (err, player) {
            if (err) {
                return showErr(err);
            }

            controls._player = player;

            play(file, player, function (err, status) {
                if (err) {
                    return showErr(err);
                }

                initPlay(status);
            });
        });
    });
}(window));
