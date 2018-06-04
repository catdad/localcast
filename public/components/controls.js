/* jshint browser: true, devel: true, expr: true */

(function (window) {
    var STATE = window.STATE;
    var UTIL = window.UTIL;

    function emit(name) {
        var args = [].slice.call(arguments);
        args.shift();

        STATE.emit.apply(STATE, ['controls:_internal:' + name].concat(args));
        STATE.emit.apply(STATE, ['controls:' + name].concat(args));
    }

    // parse the document for the interesting buttons
    var dom = {
        controls: document.querySelector('#controls'),
        play: document.querySelector('#play'),
        pause: document.querySelector('#pause'),
        stop: document.querySelector('#stop'),
        volume: document.querySelector('#volume'),
        volumeMute: document.querySelector('#volume-mute'),
        status: document.querySelector('#status'),
        cast: document.querySelector('#cast'),
        castOn: document.querySelector('#cast-filled'),
        rewind30: document.querySelector('#rewind-30'),
        forward30: document.querySelector('#forward-30'),
        show: function () {
            dom.controls.classList.remove('disabled');

            ['play', 'pause', 'stop', 'rewind30', 'forward30'].forEach(function (name) {
                dom[name].classList.remove('hide');
            });
        },
        hide: function () {
            dom.controls.classList.add('disabled');

            ['play', 'pause', 'stop', 'volume', 'volumeMute', 'rewind30', 'forward30'].forEach(function (name) {
                dom[name].classList.add('hide');
            });
        }
    };

    var commands = {
        play: function () {
            dom.show();

            // change play/pause buttons
            dom.play.classList.add('hide');
            dom.pause.classList.remove('hide');
        },
        pause: function () {
            dom.show();

            // change play/pause butons
            dom.play.classList.remove('hide');
            dom.pause.classList.add('hide');
        },
        mute: function () {
            dom.volume.classList.add('hide');
            dom.volumeMute.classList.remove('hide');
        },
        unmute: function () {
            dom.volume.classList.remove('hide');
            dom.volumeMute.classList.add('hide');
        }
    };

    function initEvents() {
        // add internal controls events
        STATE.on('controls:_internal:play', function () {
            commands.play();
        }, false);
        STATE.on('controls:_internal:pause', function () {
            commands.pause();
        }, false);
        STATE.on('controls:_internal:stop', function () {
            dom.hide();
        }, false);
        STATE.on('controls:_internal:mute', function () {
            commands.mute();
        }, false);
        STATE.on('controls:_internal:unmute', function () {
            commands.unmute();
        }, false);

        // add button events
        dom.play.addEventListener('click', function () {
            emit('play');
        }, false);
        dom.pause.addEventListener('click', function () {
            emit('pause');
        }, false);
        dom.stop.addEventListener('click', function () {
            emit('stop');
        }, false);
        dom.volume.addEventListener('click', function () {
            emit('mute');
        }, false);
        dom.volumeMute.addEventListener('click', function () {
            emit('unmute');
        }, false);
        dom.status.addEventListener('click', function () {
            emit('status');
        }, false);
        dom.cast.addEventListener('click', function () {
            emit('discover');
        }, false);

        dom.rewind30.addEventListener('click', function () {
            STATE.emit('controls:_internal:rewind30');
        }, false);
        dom.forward30.addEventListener('click', function () {
            STATE.emit('controls:_internal:forward30');
        }, false);
    }

    // monitor the slider
    var slider = (function () {
        var track = dom.controls.querySelector('.track'),
            slider = dom.controls.querySelector('.slider'),
            tooltip = dom.controls.querySelector('.tooltip'),
            width = slider.offsetWidth,
            duration = 0,
            showTooltip = false,
            tooltipTimeout,
            lastPercent = 0;

        // needs to update on window resize
        window.addEventListener('resize', function () {
            width = slider.offsetWidth;
        }, false);

        function showBarChange(percent) {
            slider.style.transform = 'translateX(' + width * percent + 'px)';

            // update tooltip if still visible
            updateTooltip(percent, showTooltip);
        }

        function setSeekPercent(percent) {
            showBarChange(percent);
            lastPercent = percent;
        }

        function setSeekSeconds(seconds) {
            setSeekPercent(seconds / duration);
        }

        function seekToPercent(percent) {
            if (percent >= 1) {
                emit('seek-end');
                percent = 1;

                return;
            }

            emit('seek', { percent: percent });
        }

        var updateTooltip = function(percent) {
            if (showTooltip) {
                UTIL.throttle(function () {
                    var text = '';

                    if (duration) {
                        var totalSeconds = percent * duration,
                            mins = parseInt(totalSeconds / 60),
                            seconds = UTIL.padNumber(parseInt(totalSeconds - (mins * 60)));

                        text = mins + ':' + seconds;
                    } else {
                        text = parseInt(percent * 100) + '%';
                    }

                    if (!tooltip.classList.contains('show')) {
                        tooltip.classList.add('show');
                    }
                    tooltip.innerHTML = text;
                });
            } else if (tooltip.classList.contains('show')) {
                tooltip.classList.remove('show');
            }
        };

        var getSeekPercent = function (ev) {
            var offset = 0;

            if (ev.changedTouches) {
                offset = ev.changedTouches[0].clientX;
            } else {
                offset = ev.clientX;
            }

            return offset / width;
        };

        var handleSeekEvent = function (ev){
            ev.preventDefault();

            var seekPercent = getSeekPercent(ev);

            // update the position and trigger the seek event
            setSeekPercent(seekPercent);

            // show the time tooltip
            updateTooltip(seekPercent);
        };

        var seekEnd = function (ev) {
            // set a timeout to clear the tooltip display
            tooltipTimeout && clearTimeout(tooltipTimeout);
            tooltipTimeout = setTimeout(function () {
                tooltipTimeout = undefined;
                showTooltip = false;
            }, 2500);

            // remove events
            window.removeEventListener('mousemove', handleSeekEvent, false);
            window.removeEventListener('mouseup', seekEnd, false);
            window.removeEventListener('touchmove', handleSeekEvent, false);
            window.removeEventListener('touchend', seekEnd, false);

            seekToPercent(getSeekPercent(ev));
        };

        var seekStart = function (ev) {
            handleSeekEvent(ev);

            showTooltip = true;

            // add additional event listeners
            window.addEventListener('mousemove', handleSeekEvent, false);
            window.addEventListener('mouseup', seekEnd, false);
            window.addEventListener('touchmove', handleSeekEvent, false);
            window.addEventListener('touchend', seekEnd, false);
        };

        // listen to mouse and touch start
        track.addEventListener('mousedown', seekStart, false);
        track.addEventListener('touchstart', seekStart, false);

        var quickSeek = (function () {
            var seekOffset = 0;
            var timer = null;

            function calcSeekPercent() {
                var currentSeconds = (lastPercent * duration);
                var seekSeconds = currentSeconds + seekOffset;
                var finalPercent = seekSeconds / duration;

                return finalPercent;
            }

            function flush() {
                timer = null;
                showTooltip = false;

                seekToPercent(calcSeekPercent());

                seekOffset = 0;
            }

            function queue() {
                if (timer) {
                    clearTimeout(timer);
                }

                showTooltip = true;
                timer = setTimeout(flush, 400);
                showBarChange(calcSeekPercent());
            }

            function back() {
                seekOffset -= 30;
                queue();
            }

            function forward() {
                seekOffset += 30;
                queue();
            }

            return {
                forward: forward,
                back: back
            };
        }());

        // track the progress using a timer... ew
        (function automaticTracking() {
            var isPlaying = false,
                time = 1000,
                timer;

            function tick() {
                if (!isPlaying) {
                    return;
                }

                var newPercent = ((lastPercent * duration) + (time / 1000)) / duration;

                setSeekPercent(newPercent);

                timer = setTimeout(tick, time);
            }

            function clearTimer() {
                if (timer) {
                    clearTimeout(timer);
                    timer = null;
                }
            }

            function onPlay() {
                isPlaying = true;
                clearTimer();

                timer = setTimeout(tick, time);
            }

            function onPause() {
                isPlaying = false;
                clearTimer();
            }

            function onSeedEnd() {
                isPlaying = false;
                clearTimer();
            }

            function destroy() {
                STATE.off('controls:_internal:play', onPlay);
                STATE.off('controls:_internal:pause', onPause);
                STATE.off('controls:_internal:seek-end', onSeedEnd);
                STATE.off('controls:_internal:stop', destroy);
                STATE.off('controls:_internal:rewind30', quickSeek.back);
                STATE.off('controls:_internal:forward30', quickSeek.forward);
            }

            STATE.on('controls:_internal:play', onPlay);
            STATE.on('controls:_internal:pause', onPause);
            STATE.on('controls:_internal:seek-end', onSeedEnd);
            STATE.on('controls:_internal:stop', destroy);
            STATE.on('controls:_internal:rewind30', quickSeek.back);
            STATE.on('controls:_internal:forward30', quickSeek.forward);
        }());

        return {
            setProgress: setSeekPercent,
            getProgress: function () {
                return lastPercent;
            },
            setDuration: function (val) {
                duration = +val || 0;
            },
            setSeekSeconds: setSeekSeconds
        };
    })();

    function setControlsState(metadata) {
        switch (metadata.state) {
            case 'paused':
                STATE.emit('controls:_internal:pause');
                break;
            case 'playing':
            case 'buffering':
                STATE.emit('controls:_internal:play');
                break;
            case 'stopped':
            case 'no_media':
                STATE.emit('controls:_internal:stop');
                break;
        }
    }

    initEvents();

    STATE.on('controls:init', function (metadata) {
        slider.setDuration(metadata.duration);
        slider.setProgress(0);

        setControlsState(metadata);
    });

    STATE.on('controls:update', function (metadata) {
        if (metadata.duration) {
            slider.setDuration(metadata.duration);
        }

        if (metadata.currentTime) {
            slider.setSeekSeconds(metadata.currentTime);
        }

        setControlsState(metadata);
    });
}(window));
