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
    
    function nextFile(file) {
        var files = STATE.get('files');
        
        if (!files) {
            return null;
        }
        
        var idx = files.indexOf(file);
        
        if (idx >= 0 && idx < files.length) {
            return files[idx + 1];
        }

        return null;
    }
    
    function onVideoPlay(file, vidElem) {
        var originalTitle = document.title;
        var player = UTIL.elem('div', { className: 'player' });
        var title = UTIL.elem('div', { className: 'video-title' });
        var vid = vidElem || UTIL.elem('video');

        vid.controls = 'controls';
        
        player.appendChild(vid);
        player.appendChild(title);
        
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
        
        function setTitle(text) {
            UTIL.empty(title);
            title.appendChild(UTIL.text(text));
            
            // set the page title to the video name
            document.title = text + ' - ' + originalTitle;
        }
        
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
        
        function tearDown() {
            vid.removeEventListener('playing', onVideoPlaying);
            vid.removeEventListener('click', onVideoClick);
            vid.removeEventListener('mousemove', onVideoMove);
            vid.removeEventListener('mouseout', onVideoOut);
            vid.removeEventListener('ended', onVideoEnded);
            window.removeEventListener('keypress', onKeyPress);
            
            vid.src = null;
            
            document.title = originalTitle;
        }
        
        function onVideoPlaying() {
            STATE.emit('modal:dim');
        }
        
        function onVideoEnded() {
            // remove existing events
            tearDown();

            var next = nextFile(file);
            
            if (next) {
                // if a next video exists, reinitialize
                // the video with the new file
                file = next;
                return initVideo(next);
            }
            
            // there is no next video to play, exit everything

            exitFullScreen();

            UTIL.raf(function() {
                STATE.emit('modal:close');
            });
        }
        
        function initVideo(file) {
            setTitle(file.name);
            
            // add video source
            vid.src = file.resource;

            // add convenient play/pause controls
            vid.addEventListener('playing', onVideoPlaying);
            vid.addEventListener('click', onVideoClick);
            vid.addEventListener('mousemove', onVideoMove);
            vid.addEventListener('mouseout', onVideoOut);
            vid.addEventListener('ended', onVideoEnded);
            window.addEventListener('keypress', onKeyPress);
            
            showTitle();
            
            vid.play();
        }
        
        function onModalOpen(wrapper) {
            initVideo(file);
        }
        
        STATE.once('modal:closed', tearDown);
        STATE.emit('modal:open', player, onModalOpen);
    }
    
    STATE.on('video:play', function (file) {
        onVideoPlay(file);
    });
}(window));
