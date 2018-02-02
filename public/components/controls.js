/* jshint browser: true, devel: true, expr: true */

(function (window) {
    var STATE = window.STATE;
    var UTIL = window.UTIL;
    
    // parse the document for the interesting buttons
    var dom = {
        controls: document.querySelector('#controls'),
        play: document.querySelector('#play'),
        pause: document.querySelector('#pause'),
        stop: document.querySelector('#stop'),
        volume: document.querySelector('#volume'),
        show: function() {
            dom.controls.classList.remove('disabled');
        },
        hide: function() {
            dom.controls.classList.add('disabled');
        }
    };
    
    var commands = {
        play: function(){
            // change play/pause buttons
            dom.play.classList.add('hide');
            dom.pause.classList.remove('hide');
        },
        pause: function(){
            // change play/pause butons
            dom.play.classList.remove('hide');
            dom.pause.classList.add('hide');
        },
        mute: function(){
            dom.volume.classList.remove('icon-unmute');
            dom.volume.classList.add('icon-mute');
        },
        unmute: function(){
            dom.volume.classList.add('icon-unmute');
            dom.volume.classList.remove('icon-mute');
        },
        castOn: function(name){
            dom.cast.classList.remove('icon-cast');
            dom.cast.classList.add('icon-cast-on');
            dom.cast.setAttribute('data-device', name);
        },
        castOff: function(){
            dom.cast.classList.add('icon-cast');
            dom.cast.classList.remove('icon-cast-on');
            dom.cast.removeAttribute('data-device');
        }
    };
    
    function initEvents() {
        // add button events
        dom.play.addEventListener('click', function(){
            commands.play();
            STATE.emit('controls:play');
        }, false);
        dom.pause.addEventListener('click', function(){
            commands.pause();
            STATE.emit('controls:pause');
        }, false);
        dom.stop.addEventListener('click', function(){
            STATE.emit('controls:stop');
        }, false);
        dom.volume.addEventListener('click', function(){
            if (dom.volume.classList.contains('icon-mute')) {
                commands.unmute();
                STATE.emit('controls:unmute');
            } else {
                commands.mute();
                STATE.emit('controls:mute');
            }
        }, false);
    }
    
    // monitor the slider
    var slider = (function(){
        var track = dom.controls.querySelector('.track'),
            slider = dom.controls.querySelector('.slider'),
            tooltip = dom.controls.querySelector('.tooltip'),
            width = slider.offsetWidth,
            transform = 0,
            seekFunction,
            duration = 0,
            showTooltip = false,
            tooltipTimeout,
            lastPercent = 0;

        // needs to update on window resize
        window.addEventListener('resize', function(){
            width = slider.offsetWidth;
        }, false);

        function setBarPercent(percent) {
            console.log('set percent', percent, duration);
            
            if (percent >= 1) {
                STATE.emit('controls:seek-end');
                percent = 1;
            }
            
            transform = width * percent;
            slider.style.transform = 'translateX(' + transform + 'px)';
            
            lastPercent = percent;

            // update tooltip if still visible
            updateTooltip(percent, showTooltip);
        }

        var updateTooltip = function(percent, show){
            if (show) {
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

                    if (!tooltip.classList.contains('show')){
                        tooltip.classList.add('show');
                    }
                    tooltip.innerHTML = text;
                });
            } else if (tooltip.classList.contains('show')) {
                tooltip.classList.remove('show');
            }
        };

        var getSeekPercent = function(ev) {
            var offset = 0;

            if (ev.changedTouches) {
                offset = ev.changedTouches[0].clientX;
            } else {
                offset = ev.clientX;
            }

            return offset / width;
        };

        var handleSeekEvent = function(ev){
            ev.preventDefault();

            var seekPercent = getSeekPercent(ev);

            // update the position and trigger the seek event
            setBarPercent(seekPercent);
            seekFunction && seekFunction(seekPercent);

            // show the time tooltip
            updateTooltip(seekPercent, showTooltip = true);

            // set a timeout to clear the tooltip display
            tooltipTimeout && clearTimeout(tooltipTimeout);
            tooltipTimeout = setTimeout(function(){ 
                tooltipTimeout = undefined;
                showTooltip = false;
            }, 2500);

            // TODO is this needed
//            events.asyncTrigger('seeking', { percent: seekPercent });
        };

        var seekEnd = function(ev){
            // remove events
            track.removeEventListener('mousemove', handleSeekEvent, false);
            track.removeEventListener('mouseup', seekEnd, false);
            track.removeEventListener('touchmove', handleSeekEvent, false);
            track.removeEventListener('touchend', seekEnd, false);

            STATE.emit('controls:seek', {
                percent: getSeekPercent(ev)
            });
        };

        var seekStart = function(ev){
            handleSeekEvent(ev);

            // add additional event listeners
            // TODO these should be on window
            track.addEventListener('mousemove', handleSeekEvent, false);
            track.addEventListener('mouseup', seekEnd, false);
            track.addEventListener('touchmove', handleSeekEvent, false);
            track.addEventListener('touchend', seekEnd, false);
        };

        // listen to mouse and touch start
        track.addEventListener('mousedown', seekStart, false);
        track.addEventListener('touchstart', seekStart, false);

        // track the progress using a timer... ew
        function automaticTracking() {
            console.log('AUTO TRACKING');
            
            var isPlaying = false,
                time = 1000,
                timer;

            function tick() {
                if (!isPlaying) {
                    return;
                }
                
                var newPercent = ((lastPercent * duration) + 1) / duration;

                setBarPercent(newPercent);

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
            
            // TODO add destroy/onStop
            
            STATE.on('controls:play', onPlay);
            STATE.on('controls:pause', onPause);
            STATE.on('controls:seek-end', onSeedEnd);
            
            onPlay();
        }
        
        return {
            autoTrack: automaticTracking,
            setProgress: setBarPercent,
            getProgress: function() {
                return lastPercent;
            },
            setDuration: function(val){
                console.log('setting duration', val);
                duration = +val || 0;
            }
        };
    })();
    
    STATE.on('controls:init', function (metadata) {
        initEvents();
        dom.show();
        
        console.log('controls medatada', metadata);
        
        if (metadata.state === 'paused') {
            commands.pause();
        } else {
            // TODO: we are assuming that if it is not paused,
            // it is playing... we will handle the 'buffering'
            // case later... requires update to friendlyCast
            commands.play();
        }
        
        slider.setDuration(metadata.duration);
        
        // TODO start this once the media is done buffering
        // and is playing
        slider.autoTrack();
    });
}(window));

var player = (function(window){
    return;

//    slider.autoTrack = automaticTracking;
//    
//    slider.enable = function(alreadyPlaying){
//        dom.show();
//        
//        if (alreadyPlaying) {
//            slider.play();
//        }
//    };
//    slider.disable = function(){
//        dom.hide();
//    };
//    
//    slider.play = function(){
//        dom.play.click();
//    };
//    
//    slider.command = commands;
//    
//    slider.reset = function(){
//        slider.setProgress(0);
//        dom.hide();
//    };
//    
//    return slider;
})(window);


// sample events
//    player.on('seeking', function(ev){
//        console.log('player event', 'seek', ev);
//    });
//
//    player.on('seeked', function(ev){
//        console.log('player event', 'seekEnd', ev);
//    });
//
//    player.on('play', function(ev){
//        console.log('player event', 'play', ev);
//    });
//
//    player.on('pause', function(ev){
//        console.log('player event', 'pause', ev);
//    });
//
//    player.on('mute', function(ev){
//        console.log('player event', 'mute', ev);
//    });
//
//    player.on('unmute', function(ev){
//        console.log('player event', 'unmute', ev);
//    });
//
//    player.on('ended', function(ev){
//        console.log('player event', 'ended', ev);
//    });
