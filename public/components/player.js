/* jshint browser: true, devel: true */        

(function (window) {
    var STATE = window.STATE;
    var UTIL = window.UTIL;
    
    function exitFullScreen() {
        var executed = false;

        ['webkitExitFullscreen', 'exitFullscreen'].forEach(function (name) {
            if (executed) {
                return;
            }

            if (document[name]) {
                document[name]();
                executed = true;
            }
        });
    }
    
    STATE.on('video:play', function (resource, name) {
        var player = UTIL.elem('div', { className: 'player' });
        var container = UTIL.elem('div', { className: 'player-container' });
        var title = UTIL.elem('div', { className: 'video-title', text: name });
        var vid = UTIL.elem('video');

        vid.src = resource;
        vid.controls = 'controls';
        
        container.appendChild(vid);
        container.appendChild(title);
        
        player.appendChild(container);
        
        var showTitle = (function () {
            var timeout;
            var time = 1000 * 3;
            var className = 'hidden';
            
            function hide() {
                title.classList.add(className);
            }
            
            return function show(timeOverride) {
                title.classList.remove(className);
                
                if (timeout) {
                    clearTimeout(timeout);
                }
                
                timeout = setTimeout(hide, timeOverride || time);
            };
        }());
        
        function togglePlaying() {
            if (vid.ended) {
                return;
            }
            
            if (vid.paused) {
                return vid.play();
            }
            
            return vid.pause();
        }
        
        function onVideoClick(ev) {
            ev.preventDefault();
            
            togglePlaying();
        }
        
        function onVideoMove(ev) {
            showTitle();
        }
        
        function onVideoOut(ev) {
            showTitle(100);
        }
        
        function onKeyPress(ev) {
            // space bar pauses and plays the video
            if (ev.which === 32 || ev.keyCode === 32) {
                onVideoClick(ev);
            }
        }
        
        function onVideoEnded() {
            var defaultPrevented = false;
                
            STATE.emit('video:ended', {
                preventDefault: function () {
                    defaultPrevented = true;
                }
            });

            if (defaultPrevented) {
                return;
            }

            tearDown();
            exitFullScreen();

            UTIL.raf(function() {
                STATE.emit('modal:close');
            });
        }
        
        function tearDown() {
            vid.removeEventListener('click', onVideoClick);
            vid.removeEventListener('mousemove', onVideoMove);
            vid.removeEventListener('mouseout', onVideoOut);
            vid.removeEventListener('ended', onVideoEnded);
            window.removeEventListener('keypress', onKeyPress);
            
            vid.src = null;
        }
        
        function onModalOpen(wrapper) {
            // set the page title to the video name
            var documentTitle = document.title;
            document.title = name + ' - ' + documentTitle;

            // add convenient play/pause controls
            vid.addEventListener('click', onVideoClick);
            vid.addEventListener('mousemove', onVideoMove);
            vid.addEventListener('mouseout', onVideoOut);
            vid.addEventListener('ended', onVideoEnded);
            window.addEventListener('keypress', onKeyPress);

            STATE.once('modal:closing', function () {
                // return the title back to the original
                document.title = documentTitle;
                
                wrapper.classList.remove('dim');
            });
            
            UTIL.once(vid, 'playing', function () {
                wrapper.classList.add('dim');
                showTitle();
            });
            
            vid.play();
        }
        
        STATE.once('modal:closed', tearDown);
        STATE.emit('modal:open', player, onModalOpen);        
    });
}(window));
