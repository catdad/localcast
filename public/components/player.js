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
        
        var duration;
        
        // set the page title to the video name
        var documentTitle = document.title;
        document.title = name + ' - ' + documentTitle;
        
        function togglePlaying(ev) {
            ev.preventDefault();
            
            if (vid.ended) return;
            
            if (vid.paused) {
                vid.play();
            } else {
                vid.pause();
            }
        }
        
        function keyPress(ev) {
            if (ev.which === 32 || ev.keyCode === 32) {
                togglePlaying(ev);
            }
        }
        
        vid.addEventListener('click', togglePlaying);
        window.addEventListener('keypress', keyPress);
        
        vid.addEventListener('durationchange', function(ev){
            duration = vid.duration;
        });
        
        function setupVideoControls(wrapper) {
            window.vid = vid;
            
            vid.addEventListener('playing', function(){
                if (!wrapper.classList.contains('dim')) {
                    wrapper.classList.add('dim');
                }
            });
            
            vid.addEventListener('ended', function(){
                window.removeEventListener('keypress', keyPress);
                exitFullScreen();
                
                UTIL.raf(function() {
                    STATE.emit('modal:close');
                });
            });
        }
        
        function onWrapperReceived(wrapper) {
            STATE.once('modal:closing', function () {
                // return the title back to the original
                document.title = documentTitle;
                
                wrapper.classList.remove('dim');
            });
            
            while (wrapper.firstChild) {
                wrapper.removeChild(wrapper.firstChild);
            }
            
            wrapper.appendChild(vid);
            setupVideoControls(wrapper);
            vid.play();
        }
        
        STATE.emit('modal:open', vid, onWrapperReceived);
    });
}(window));
