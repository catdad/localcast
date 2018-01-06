/* jshint browser: true, devel: true */
/* globals request, hash, chromecast, server, toast */

(function (window) {
    var UTIL = window.UTIL;
    var STATE = window.STATE;
    
    var currentModal;
    
    // event name enum (includes browser-specific events)
    var eventName = function (fake) {
        var getName = function(prop){
            return fake.style[prop.toLowerCase()] !== undefined ? prop.toLowerCase() + 'end' :
                   fake.style['Webkit' + prop] !== undefined ? 'webkit' + prop + 'End' :
                   fake.style['O' + prop] !== undefined ? 'o' + prop + 'End' :
                   fake.style['Moz' + prop] !== undefined ? 'moz' + prop + 'End' : prop.toLowerCase() + 'end';
        };

        return {
            animationEnd: getName('Animation'),
            transitionEnd: getName('Transition')
        };
    }(document.createElement('div'));
    
    function Modal(contentDom, onOpen, origin) {
        var wrapper = UTIL.elem('div', { className: 'modal_wrapper' }),
            onClose, onBeforeClose, isClosed = false;
            
        contentDom.classList.add('modal');
        
        if (origin && origin.x !== undefined && origin.y !== undefined) {
            wrapper.style.transformOrigin = origin.x + 'px ' + origin.y + 'px';
        } else {
            wrapper.style.transformOrigin = '50% 50%';
        }
        
        // wrapper transition callback
        var wrapperTransitionEnded = function() {
            if (onOpen) {
                onOpen(wrapper);
            }
        };
        
        document.body.appendChild(wrapper);
        
        // execute the transition on the next animation frame
        UTIL.raf(function() {
            // add callback for when the animation ends
            UTIL.once(wrapper, eventName.transitionEnd, wrapperTransitionEnded);
            
            // Chrome on Android won't trigger a transition if this is executed without a timeout,
            // don't know why...
            UTIL.defer(function() {
                wrapper.classList.add('open');
            });
        });
        
        function removeModalContent(done) {
            // when the modal is done closing, hide it
            UTIL.once(contentDom, eventName.transitionEnd, function(ev){
                // stop this event from triggering the wrapper transition end as well
                ev.preventDefault();
                ev.stopPropagation();
                
                // hide the content for now -- it can be removed later
                contentDom.style.visibility = 'hidden';
                
                // trigger the done callback
                UTIL.raf(function() {
                    if (done) {
                        done();
                    }
                });
            });
            
            contentDom.classList.add('remove');
        }
        
        function closeModal(done) {
            if (isClosed) return;
            else isClosed = true;
            
            var defaultPrevented = false;
            
            // trigger the beforeClose even before anything else happens
            STATE.emit('modal:closing');
            if (onBeforeClose) {
                onBeforeClose({
                    preventDefault: function(){ defaultPrevented = true; }
                });
            }
            
            if (defaultPrevented) { 
                isClosed = false;
                return;
            }
            
            // when the wrapper is done animating, remove it
            UTIL.once(wrapper, eventName.transitionEnd, function(){
                document.body.removeChild(wrapper);
                
                // trigger done callback if it exists
                if (done) {
                    done();
                }
                
                // trigger onClose, if one was provided
                STATE.emit('modal:closed');
                if (onClose) {
                    onClose();
                }
            });
            
            // remove the open class to animate
            wrapper.classList.remove('open');
        }
        
        // close Modal if clicking on the black space
        wrapper.onclick = function(ev) {
            // trigger a close using the "back" button
            if (ev.target === wrapper) triggerCloseModal();
        };
        
        // close the modal on the next pop state
        hash.onNextPop(function(ev){
            if (!isClosed) {
                ev.preventDefault();
                // perform an actual close on the modal
                closeModal();
            }
        });
        
        // push the current state onto the stack
        hash.push({ resource: hash.state() });
        
        function triggerCloseModal(){
            // trigger a pop state in order to close the modal
            hash.back();
        }
        
        return {
            close: triggerCloseModal,
            replace: function(newContent, cb){
                removeModalContent(function(){
                    if (cb) {
                        cb(wrapper);
                    }
                });
            },
            onClose: function(cb){
                onClose = typeof cb === 'function' ? cb : undefined;
            },
            onBeforeClose: function(cb) {
                onBeforeClose = typeof cb === 'function' ? cb : undefined;
            }
        };
    }
    
    STATE.on('modal:open', function (contentDom, onOpen, origin) {
        if (currentModal) {
            return currentModal.replace(contentDom, onOpen);
        }
        
        currentModal = Modal(contentDom, onOpen, origin);
    });
    
    STATE.on('modal:close', function (cb) {
        if (currentModal) {
            currentModal.close();
        }
    });
    
    STATE.on('modal:closing', function () {
        currentModal = null;
    });
}(window));
