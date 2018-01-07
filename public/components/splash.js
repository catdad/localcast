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
    
    function createPlayButton(resource, name, thumb) {
        var playLocalButton = createButton('Play');
        
        playLocalButton.onclick = function() {
            STATE.emit('video:play', resource, name);
        };
        
        return playLocalButton;
    }
    
    function createCastButton(resource, name, thumb) {
        var playCastButton = createButton('Cast');
        
        playCastButton.onclick = function(){
            function browserCast() {
                chromecast.startCast(resource, {
                    title: name,
                    images: [{ url: thumb }]
                });
            }
            
            function serverCast() {
                STATE.emit('modal:close');
                server.playNew(resource, name, thumb);
            }
            
            if (chromecast.isAvailable() && false) {
                browserCast();
            } else {
                serverCast();
            }
        };
        
        return playCastButton;
    }
    
    STATE.on('splash', function (ev, thumb, resource, name, domTrigger) {
        var modal = UTIL.elem('div'),
            container = UTIL.elem('div'),
            image = UTIL.elem('img', { className: 'thumb' }),
            title = UTIL.elem('div', { className: 'title', text: name }),
            modalWrapper;
        
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
        
        var playButton = createPlayButton(resource, name, thumb);
        var castButton = createCastButton(resource, name, thumb);
        
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
            window.UTIL.raf(function() {
                modal.style.height = ( cWidth * height / width ) + containerHeight + 'px';
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
        image.src = thumb;
        
        window.STATE.emit('modal:open', modal, function onOpen(wrapper) {
            modalWrapper = wrapper;
            
            if (imageIsLoaded) {
                imageOnLoad(wrapper);
            } else {
                modalIsOpen = true;
                // add spinner while the image loads
                wrapper.appendChild(UTIL.elem('div', { className: 'loading' }));
            }
        }, origin);
    });
}(window));
