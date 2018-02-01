/* jshint browser: true, devel: true */        
/* globals request, hash, chromecast, server, toast */

(function (window) {
    var STATE = window.STATE;
    
    var controls = ['play', 'pause', 'stop'].reduce(function (memo, name) {
        memo[name] = function () {
            console.log(name, 'control');
            chromecast.control[name]();
        };
        
        return memo;
    }, {});
    
    function initControls() {
        STATE.on('controls:play', controls.play);
        STATE.on('controls:pause', controls.pause);
        STATE.on('controls:stop', controls.stop);
    }
    
    function destroyControls() {
        STATE.off('controls:stop', controls.stop);
        STATE.off('controls:pause', controls.pause);
        STATE.off('controls:stop', controls.stop);
    }
    
    function onMediaDiscovered(ev) {
        var media = chromecast.media.media;
        
        console.log('media discovered event', chromecast.media.media);
        
        initControls();
        
        STATE.emit('controls:init', {
            name: media.metadata.title,
            duration: chromecast.control.duration(),
            state: chromecast.control.status()
        });
    }
    
    function onMediaStopped() {
        console.log('media stopped event');
        destroyControls();
    }
    
    // any time we discover media, we will attempt to control it
    chromecast.on(chromecast.Events.mediaDiscovered, onMediaDiscovered);
    chromecast.on(chromecast.Events.mediaEnd, onMediaStopped);
        
    STATE.on('browsercast:play', function (file) {
        //play the media
        chromecast.startCast(file.resource, {
            title: file.name,
            images: [{ url: file.thumb }]
        });
    });
}(window));
