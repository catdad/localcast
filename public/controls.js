/* jshint browser: true, devel: true, expr: true */        

var player = (function(window){

    // Event module
    // https://gist.github.com/catdad/9acd13dd3a8a34a79de6
    var EventEmitter = function(){
        var events = {};

        this.on = function(name, callback){
            name = name.toLowerCase();
            events[name] = events[name] || [];
            events[name].push(callback);

            return this;
        };

        this.off = function(name, callback){
            name = name.toLowerCase();
            if (name in events === false) return this;
            events[name].splice(events[name].indexOf(callback), 1);
            return this;
        };

        this.once = function(name, callback){
            function disposable(){
                this.off(name, disposable);
                callback.apply(this, arguments);
            }

            this.on(name, disposable);

            return this;
        };

        this.trigger = function(name){
            var that = this,
                args = arguments;

            name = name.toLowerCase();

            if (name in events === false) return this;
            events[name].forEach(function(fn){
                fn.apply(that, [].slice.call(args, 1));
            });

            return this;
        };

        this.asyncTrigger = function(name){
            var args = arguments,
                that = this;
            setTimeout(function(){
                that.trigger.apply(that, args);
            }, 0);

            return this;
        };
    };
    
    // helper -- throttle function
    function throttle(func) {
        return setTimeout(func, 64);
    }
    
    // helper -- pad numbers
    var padNumber = function(n, len){
        var s = n.toString();
        while(s.length < (len || 2)) { s = '0' + s; }
        return s;
    };

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
            dom.volume.classList.remove('octicon-unmute');
            dom.volume.classList.add('octicon-mute');
        },
        unmute: function(){
            dom.volume.classList.add('octicon-unmute');
            dom.volume.classList.remove('octicon-mute');
        }
    };
    
    // event emitter for the controls module
    var events = new EventEmitter();
    
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

        var setBarPercent = function(percent){
            if (percent >= 1) {
                events.asyncTrigger('ended');
                percent = 1;
            }
            
            transform = width * percent;
            slider.style.transform = 'translateX(' + transform + 'px)';
            
            lastPercent = percent;

            // update tooltip if still visible
            updateTooltip(percent, showTooltip);
        };

        var updateTooltip = function(percent, show){
            if (show) {
                throttle(function(){
                    var text = '';
                    if (duration) {
                        var totalSeconds = percent * duration,
                            mins = parseInt(totalSeconds / 60),
                            seconds = padNumber(parseInt(totalSeconds - (mins * 60)));

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

            events.asyncTrigger('seeking', { percent: seekPercent });
        };

        var seekEnd = function(ev){
            // remove events
            track.removeEventListener('mousemove', handleSeekEvent, false);
            track.removeEventListener('mouseup', seekEnd, false);
            track.removeEventListener('touchmove', handleSeekEvent, false);
            track.removeEventListener('touchend', seekEnd, false);

            events.asyncTrigger('seeked', { percent: getSeekPercent(ev) });
        };

        var seekStart = function(ev){
            handleSeekEvent(ev);

            // add additional event listeners
            track.addEventListener('mousemove', handleSeekEvent, false);
            track.addEventListener('mouseup', seekEnd, false);
            track.addEventListener('touchmove', handleSeekEvent, false);
            track.addEventListener('touchend', seekEnd, false);
        };

        // listen to mouse and touch start
        track.addEventListener('mousedown', seekStart, false);
        track.addEventListener('touchstart', seekStart, false);

        // add button events
        dom.play.addEventListener('click', function(){
            commands.play();
            
            events.asyncTrigger('play');
        }, false);
        dom.pause.addEventListener('click', function(){
            commands.pause();
            
            events.asyncTrigger('pause');
        }, false);
        dom.stop.addEventListener('click', function(){
            
            events.asyncTrigger('stop');
        }, false);

        var mute = function() {
            commands.mute();
            events.asyncTrigger('mute');
        };
        var unmute = function() {
            commands.unmute();
            events.asyncTrigger('unmute');
        };

        dom.volume.addEventListener('click', function(){
            if (dom.volume.classList.contains('octicon-mute')) {
                unmute();
            } else {
                mute();
            }
        }, false);

        return {
            setProgress: setBarPercent,
            getProgress: function() {
                return lastPercent;
            },
            on: function(name, cb){
                events.on(name, cb);   
            },
            once: function(name, cb){
                events.once(name, cb);   
            },
            off: function(name, cb){
                events.off(name, cb);
            },
            setDuration: function(val){
                console.log('setting duration', val);
                duration = +val || 0;
            }
        };
    })();
    
    // track the progress using a timer... ew
    function automaticTracking(){
        var isPlaying = false,
            time = 1000,
            timer;
        
        var tick = function(){
            var newPercent = ((slider.getProgress() * 100) + 1) / 100;
            
            slider.setProgress( newPercent );
            
            if (isPlaying) {
                timer = setTimeout(tick, time);
            }
        };
        
        events.on('play', function(){
            isPlaying = true;
            
            timer = setTimeout(tick, time);
        });
        
        events.on('pause', function(){
            isPlaying = false;
            
            if (timer) {
                clearTimeout(timer);
                timer = undefined;
            }
        });
        
        events.on('ended', function(){
            isPlaying = false;
            
            if (timer) {
                clearTimeout(timer);
                timer = undefined;
            }
        });
    }
    
    slider.autoTrack = automaticTracking;
    
    slider.enable = function(alreadyPlaying){
        dom.show();
        
        if (alreadyPlaying) {
            slider.play();
        }
    };
    slider.disable = function(){
        dom.hide();
    };
    
    slider.play = function(){
        dom.play.click();
    };
    
    slider.command = commands;
    
    slider.reset = function(){
        slider.setProgress(0);
        dom.hide();
    };
    
    return slider;
})(window);


// sample events
    player.on('seeking', function(ev){
        console.log('player event', 'seek', ev);
    });

    player.on('seeked', function(ev){
        console.log('player event', 'seekEnd', ev);
    });

    player.on('play', function(ev){
        console.log('player event', 'play', ev);
    });

    player.on('pause', function(ev){
        console.log('player event', 'pause', ev);
    });

    player.on('mute', function(ev){
        console.log('player event', 'mute', ev);
    });

    player.on('unmute', function(ev){
        console.log('player event', 'unmute', ev);
    });

    player.on('ended', function(ev){
        console.log('player event', 'ended', ev);
    });
