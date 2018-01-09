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
        var vid = UTIL.elem('video', { className: 'modal video' });
        vid.src = resource;
        vid.controls = 'controls';
        
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
        
        function onKeyPress(ev) {
            // space bar pauses and plays the video
            if (ev.which === 32 || ev.keyCode === 32) {
                onVideoClick(ev);
            }
        }
        
        function tearDown() {
            vid.removeEventListener('click', onVideoClick);
            window.removeEventListener('keypress', onKeyPress);
            
            vid.src = null;
        }
        
        function onModalOpen(wrapper) {
            // set the page title to the video name
            var documentTitle = document.title;
            document.title = name + ' - ' + documentTitle;

            // add convenient play/pause controls
            vid.addEventListener('click', onVideoClick);
            window.addEventListener('keypress', onKeyPress);

            STATE.once('modal:closing', function () {
                // return the title back to the original
                document.title = documentTitle;
                
                wrapper.classList.remove('dim');
            });
            
            UTIL.once(vid, 'playing', function () {
                wrapper.classList.add('dim');
            });
            
            vid.addEventListener('ended', function() {
                tearDown();
                exitFullScreen();
                
                UTIL.raf(function() {
                    STATE.emit('modal:close');
                });
            });
            
            vid.play();
        }
        
        STATE.once('modal:closed', tearDown);
        STATE.emit('modal:open', vid, onModalOpen);        
    });
}(window));
