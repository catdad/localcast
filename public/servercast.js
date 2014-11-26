/* global toast, request, player */
/* jshint browser: true, expr: true, devel: true */

var server = function(){
    function toastControls(actions){
        
    }

    function serverError(err, data) {
        if (err) {
            toast.error('unexpected error: ' + err.message);
            return true;
        } else if (data.success === false) {
            toast.error('server error: ' + data.err);
            return true;
        } else {
            return false;
        }
    }
    
    function connectEvents(){
        player.on('play', play);
        player.on('pause', pause);
        player.on('stop', stop);
        player.on('mute', mute);
        player.on('unmute', unmute);
    }
    function disconnectEvents(){
        player.off('play', play);
        player.off('pause', pause);
        player.off('stop', stop);
        player.off('mute', mute);
        player.off('unmute', unmute);
    }
    
    function handleNowPlaying(data) {
        // disconnect events if connected
        disconnectEvents();
        
        var status = data.playerState.toLowerCase(),
            media = data.media,
            resource = media ? media.contentId : undefined,
            duration = media ? media.duration : undefined,
            progress = data.currentTime,
            isMuted = !!data.volume.muted;
        
        console.log(data);
        
        duration && player.setDuration(duration);
        
        player.enable();
        player.command.play();
        
        connectEvents();
    }
    
    function nowPlaying(data){
        if (data) {
            handleNowPlaying(data);
        } else {
            request.json('/session/nowPlaying', function(err, data){
                if (serverError(err, data)) { return; }
                
                // check to make sure nowPlaying is not `false`
                if (data.nowPlaying) {
                    try {
                        handleNowPlaying(data.nowPlaying); 
                    } catch (e) {
                        console.log(e);
                    }    
                }
            });
        }
    }
    
    function playNew(url, name){
        var uri = '/session/play';

        if (url) {
            uri += '?value=' + encodeURIComponent(url);
        }
        
        var clearToast;

        request.json(uri, function(err, data){
            clearToast && clearToast();
            
            // check if there was a server error
            if (serverError(err, data)) { return; }
            
            name && toast.success('playing ' + name);
            nowPlaying();
        });
        
        clearToast = toast.log('Just a moment...', -1);
    }
    function play(){
        console.log('got play request');
        request.json('/session/play', function(err, data){
            if (serverError(err, data)) { return; }
        });
    }
    function pause(){
        request.json('/session/pause', function(err, data){
            if (serverError(err, data)) { return; }
            
        });
    }
    function mute(){
        request.json('/session/mute', function(err, data){
            if (serverError(err, data)) { return; }
            
        });
    }
    function unmute(){
        request.json('/session/unmute', function(err, data){
            if (serverError(err, data)) { return; }
            
        });
    }
    
    function stop(){
        request.json('/session/stop', function(err, data){
            if (serverError(err, data)) { return; }
            
            toast.info('video stopped');
            disconnectEvents();
            player.reset();
        });
    }
    
    return {
        playNew: playNew,
        play: play,
        pause: pause,
        stop: stop,
        mute: mute,
        unmute: unmute,
        nowPlaying: nowPlaying
    };
    
}();