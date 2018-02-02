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
    }, {
        mute: function () {
            chromecast.control.volume('mute');
        },
        unmute: function () {
            chromecast.control.volume('unmute');
        },
        seek: function (ev) {
            var seekSeconds = chromecast.control.duration() * ev.percent;
            chromecast.control.seek(seekSeconds);
        }
    });
    
    function initControls() {
        STATE.on('controls:play', controls.play);
        STATE.on('controls:pause', controls.pause);
        STATE.on('controls:stop', controls.stop);
        STATE.on('controls:mute', controls.mute);
        STATE.on('controls:unmute', controls.unmute);
        STATE.on('controls:seek', controls.seek);
    }
    
    function destroyControls() {
        STATE.off('controls:stop', controls.stop);
        STATE.off('controls:pause', controls.pause);
        STATE.off('controls:stop', controls.stop);
        STATE.off('controls:mute', controls.mute);
        STATE.off('controls:unmute', controls.unmute);
        STATE.off('controls:seek', controls.seek);
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
        try {
            //play the media
            chromecast.startCast(file.resource, {
                title: file.name,
                images: [{ url: file.thumb }]
            });    
        } catch (e) {
            toast.error('Casting is not supported on this browser.');
        }
    });
}(window));
