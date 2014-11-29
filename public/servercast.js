/* global toast, request, player, views */
/* jshint browser: true, expr: true, devel: true */

var server = function(){
    var endpoint = '/session2/',
        connectedDevice;
    
    function serverError(err, data) {
        if (err) {
            toast.error('unexpected error: ' + err.message);
            return true;
        } else if (data.success === false) {
            toast.error('server error: ' + data.error);
            return true;
        } else {
            return false;
        }
    }
    
    player.on('castSelect', function(){
        deviceList();
    });
    
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
        
        console.log(data);
        
        //duration && player.setDuration(duration);
        
        player.enable();
        player.command.play();
        
        connectEvents();
    }
    
    function handleDeviceSelect(data) {
        var list = data.list;
        
        views.deviceSelectModal(list, function onSelected(selected){
            console.log('selected', selected);
            connect(selected);
        }, function onCancel(){
        
        });
    }
    
    function connect(deviceName){
        request.json(endpoint + 'connect?device=' + deviceName, function(err, data){
            if (serverError(err, data)) {
                connectedDevice = undefined;
                return;
            }
            
            connectedDevice = deviceName;
            
            toast.success('Connected to ' + deviceName);
        });
    }
    
    function nowPlaying(data){
        if (data) {
            handleNowPlaying(data);
        } else {
            request.json(endpoint + 'nowPlaying', function(err, data){
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
    
    function playNew(url, name, thumb){
        var uri = endpoint + 'play';

        if (url) {
            uri += '?url=' + encodeURIComponent(url);
            uri += name ? '&title=' + encodeURIComponent(name) : '';
            uri += thumb ? '&thumb=' + encodeURIComponent(thumb) : '';
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
        request.json(endpoint + 'play', function(err, data){
            if (serverError(err, data)) { return; }
        });
    }
    function pause(){
        request.json(endpoint + 'pause', function(err, data){
            if (serverError(err, data)) { return; }
            
        });
    }
    function mute(){
        request.json(endpoint + 'mute', function(err, data){
            if (serverError(err, data)) { return; }
            
        });
    }
    function unmute(){
        request.json(endpoint + 'unmute', function(err, data){
            if (serverError(err, data)) { return; }
            
        });
    }
    
    function stop(){
        request.json(endpoint + 'stop', function(err, data){
            if (serverError(err, data)) { return; }
            
            toast.log('video stopped');
            disconnectEvents();
            player.reset();
        });
    }
    
    function deviceList(){
        request.json(endpoint + 'devices', function(err, data){
            if (serverError(err, data)) { 
                toast.error('Could not get devices');
                console.log('device list err:', err, data);
                return;
            }
            
            handleDeviceSelect(data);
        });
    }
    
    return {
        deviceList: deviceList,
        playNew: playNew,
        play: play,
        pause: pause,
        stop: stop,
        mute: mute,
        unmute: unmute,
        nowPlaying: nowPlaying
    };
}();
