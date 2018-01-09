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
        
        // set the page title to the video name
        var documentTitle = document.title;
        document.title = name + ' - ' + documentTitle;
        
        function togglePlaying() {
            if (vid.ended) return;
            
            if (vid.paused) {
                vid.play();
            } else {
                vid.pause();
            }
        }
        
        function onVideoClick(ev) {
            ev.preventDefault();
            
            togglePlaying();
        }
        
        function onKeyPress(ev) {
            if (ev.which === 32 || ev.keyCode === 32) {
                onVideoClick(ev);
            }
        }
        
        function tearDown() {
            window.removeEventListener('keypress', onKeyPress);
            vid.removeEventListener('click', onVideoClick);
            
            vid.src = null;
        }
        
        function onModalOpen(wrapper) {
            vid.addEventListener('click', onVideoClick);
            window.addEventListener('keypress', onKeyPress);

            STATE.once('modal:closing', function () {
                // return the title back to the original
                document.title = documentTitle;
                
                wrapper.classList.remove('dim');
            });
            
            vid.addEventListener('playing', function(){
                if (!wrapper.classList.contains('dim')) {
                    wrapper.classList.add('dim');
                }
            });
            
            vid.addEventListener('ended', function(){
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
