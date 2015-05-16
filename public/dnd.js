/* jshint browser: true */

function handleFiles(files) {
//    mediaList.push.apply(mediaList, [].slice.call(files));
//    displayMediaList( mediaList.get() );
//    
//    if (mediaList.hasNext()) {
//        playFileAutoSelect( mediaList.cursor(0) );
//    }
}

var dropbox = document.querySelector('#dropbox');

function killEvent(ev) {
    ev.stopPropagation();
    ev.preventDefault();
}

function addClass(target, className) {
    if (!target.className.match( new RegExp(className) )) {
        target.classList.add(className);
        throttle(function(){ target.style.opacity = 1; });
    }
}

function removeClass(target, className) {
    var regexp = new RegExp(className);
    if (target.classList.contains(className)) {
        target.style.opacity = '';
        throttle(function(){ target.classList.remove(className); });
    }
}

function throttle(func) {
    return setTimeout(func, 64);
}

function dragover(ev) {
    killEvent(ev);
    
    // clear any pending leave events
    clearTimeout(dragThrottle);
    
    addClass(dropbox, 'show');
}

function dragleave(ev) {
    killEvent(ev);
    
    // delay execution of this event
    dragThrottle = throttle(function(){
        removeClass(dropbox, 'show');
    });
}

function drop(ev) {
    killEvent(ev);
    removeClass(dropbox, 'show');
    
    dropbox.className = document.body.className.replace(/show/g, '');

    handleFiles(ev.dataTransfer.files);
}

var dragThrottle;
window.addEventListener("dragenter", killEvent, false);
window.addEventListener("dragleave", dragleave, false);
window.addEventListener("dragover", dragover, false);
window.addEventListener("drop", drop, false);