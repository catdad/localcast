/* jshint browser: true, devel: true */
/* globals request, hash, chromecast, server, toast */

(function (window) {
    var UTIL = window.UTIL;
    var STATE = window.STATE;
    
    STATE.on('splash', function (ev, thumb, resource, name, domTrigger) {
        var modal = UTIL.elem('div'),
            container = UTIL.elem('div'),
            image = UTIL.elem('img', { className: 'thumb' }),
            title = UTIL.elem('div', { className: 'title', text: name }),
            modalWrapper;
        
        container.appendChild(title);
        
        // get the origin to use for animation
        var triggerBB = domTrigger.getBoundingClientRect(),
            origin = {
                x: (triggerBB.left + triggerBB.right) / 2,
                y: (triggerBB.top + triggerBB.bottom) / 2
            };
        
        var playLocalButton = document.createElement('button');
        var playCastButton = document.createElement('button');
      
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
            container.appendChild(playLocalButton);
            container.appendChild(playCastButton);
            
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
        
        // Build the play and cast buttons while we wait for the image
        playLocalButton.className = 'play';
        playCastButton.className = 'cast';
        
        var playIcon = UTIL.elem('span', { className: 'icon icon-play' }),
            playText = document.createTextNode('Play');
        var castIcon = UTIL.elem('span', { className: 'icon icon-cast' }),
            castText = document.createTextNode('Cast');
        
        playLocalButton.appendChild(playIcon);
        playLocalButton.appendChild(playText);
        playCastButton.appendChild(castIcon);
        playCastButton.appendChild(castText);
        
        playLocalButton.onclick = function() {
            STATE.emit('video:play', resource, name);
        };

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
