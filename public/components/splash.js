/* jshint browser: true, devel: true */
/* globals request, hash, chromecast, server, toast */

(function (window) {
    var UTIL = window.UTIL;
    var STATE = window.STATE;
    
    function createButton(text) {
        var type = text.toLowerCase();
        
        var buttonElem = UTIL.elem('button', { className: type });
        var iconElem = UTIL.elem('span', { className: 'icon icon-' + type });
        var textElem = document.createTextNode(text);
        
        buttonElem.appendChild(iconElem);
        buttonElem.appendChild(textElem);
        
        return buttonElem;
    }
    
    function createPlayButton(file, elem) {
        var playLocalButton = createButton('Play');
        
        playLocalButton.onclick = function() {
            STATE.emit('video:play', file);
        };
        
        return playLocalButton;
    }
    
    function createCastButton(file) {
        var castName = chromecast.isAvailable() ? 'Browser Cast' : 'Server Cast';
        var button = createButton(castName);
        
        button.onclick = function(){
            function browserCast() {
                STATE.emit('browsercast:play', file);
                STATE.emit('modal:close');
            }
            
            function serverCast() {
                STATE.emit('modal:close');
                server.playNew(file.resource, file.name, file.thumb);
            }
            
//            if (chromecast.isAvailable()) {
                browserCast();
//            } else {
//                serverCast();
//            }
        };
        
        return button;
    }
    
    function progressBar() {
        var container = UTIL.elem('div', { className: 'progress-container' });
        var bar = UTIL.elem('div', { className: 'progress-bar' });
        
        container.appendChild(bar);
        
        var duration = 1000 * 5;
        var start = Date.now();
        var stopped = false;
        
        function onDone() {
            bar.style.width = '100%';

            if (api.ondone) {
                api.ondone();
            }
        }
        
        function onFrame() {
            if (stopped) {
                return;
            }
            
            var time = Date.now();
            var elapsed = Date.now() - start;
            
            if (elapsed > duration) {
                return onDone();
            }
            
            bar.style.width = (elapsed / duration * 100) + '%';
            
            return UTIL.raf(onFrame);
        }
        
        var api = {
            start: function () {
                UTIL.raf(onFrame);
            },
            stop: function () {
                stopped = true;
            },
            dom: container
        };
        
        return api;
    }
    
    STATE.on('splash', function (file, domTrigger) {
        var modal = UTIL.elem('div'),
            container = UTIL.elem('div'),
            image = UTIL.elem('img', { className: 'thumb' }),
            title = UTIL.elem('div', { className: 'title', text: file.name }),
            modalWrapper;
        
        var playButton = createPlayButton(file, domTrigger);
        var castButton = createCastButton(file, domTrigger);
        
        var progress = progressBar();
        
        // cancel the progress if either of these buttons is clicked by the user    
        [playButton, castButton].forEach(function (button) {
            UTIL.once(button, 'click', function () {
                progress.stop();
            });
        });
        
        // when progress is done, click the play button automatically
        progress.ondone = function () {
            playButton.click();
        };
        
        container.appendChild(progress.dom);
        container.appendChild(title);
        
        // get the origin to use for animation
        var triggerBB = domTrigger.getBoundingClientRect();
        var origin = {
            x: (triggerBB.left + triggerBB.right) / 2,
            y: (triggerBB.top + triggerBB.bottom) / 2
        };
        
        // first, queue the image to load, and keep track here
        var modalIsOpen = false,
            imageIsLoaded = false;
        
        // this function should be executed after image has loaded and tranition has ended
        var imageOnLoad = function(wrapper) {
            // make sure the modal is empty
            while(wrapper && wrapper.firstChild) { 
                wrapper.removeChild(wrapper.firstChild);
            }
            
            wrapper.appendChild(modal);
            
            // get necessary dimensions
            var cWidth = modal.clientWidth,
                width = image.width,
                height = image.height;
            
            // insert the image first
            modal.appendChild(image);
            
            // insert the two buttons created earlier
            container.appendChild(playButton);
            container.appendChild(castButton);
            
            modal.appendChild(container);
            
            var containerHeight = container.offsetHeight;
            
            // let's animate the height transition as well
            UTIL.raf(function() {
                modal.style.height = ( cWidth * height / width ) + containerHeight + 'px';
                
                progress.start();
            });
        };
        
        // add an onload callback and a source to the image
        image.onload = function() {
            if (modalIsOpen) {
                imageOnLoad(modalWrapper);
            } else {
                imageIsLoaded = true;
            }
        };
        image.src = file.thumb;
        
        STATE.emit('modal:open', modal, function onOpen(wrapper) {
            modalWrapper = wrapper;
            
            if (imageIsLoaded) {
                imageOnLoad(wrapper);
            } else {
                modalIsOpen = true;
                // add spinner while the image loads
                wrapper.appendChild(UTIL.elem('div', { className: 'loading' }));
            }
        }, origin);
        
        STATE.once('modal:closing', function () {
            // stop the progress bar from triggering an event if the modal closes early
            progress.stop();
        });
    });
}(window));
