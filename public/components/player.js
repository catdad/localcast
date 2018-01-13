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
        var player = UTIL.elem('div', { className: 'player' });
        var title = UTIL.elem('div', { className: 'video-title', text: file.name });
        var vid = vidElem || UTIL.elem('video');

        vid.src = file.resource;
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
            // remove existing events
            tearDown();

            var next = nextFile(file);
            
            if (next) {
                // if a next video exists, play it in
                // replacement mode
                return onVideoPlay(next, vid);
            }

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
            document.title = file.name + ' - ' + documentTitle;

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
    }
    
    STATE.on('video:play', function (file) {
        onVideoPlay(file);
    });
}(window));
