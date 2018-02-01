/* global toast, request, player, views */
/* jshint browser: true, expr: true, devel: true */

var server = function(){
    return;
    var endpoint = '/session2/',
        connectedDevice,
        sessionAnnounced = false;
    
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
    
    player.on('castSelect', function(ev){
        console.log(ev);
        if (ev.connected === false) {
            deviceList();
        } else {
            handleDeviceDeselect(ev.connectedTo);
        }
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
    
    function handleNowPlaying(data, justFetched) {
        // disconnect events if connected
        disconnectEvents();
        
        function connectedTo(deviceName, mediaTitle){
            player.command.castOn(deviceName);

            if (!sessionAnnounced || connectedDevice !== deviceName){
                toast.log('Connected to ' + deviceName);
                connectedDevice = deviceName;
                sessionAnnounced = true;
                
                if (mediaTitle) {
                    toast.log('Playing ' + mediaTitle);
                }
            }
        }
        
        if (data.playing) {
            var state = !!data.state && data.state.toLowerCase(),
                duration = (data.duration === +data.duration) ? +data.duration : 0;

            duration && player.setDuration(duration);

            if (state === 'playing' || state === 'buffering') {
                player.command.play();
            } else if (state === 'paused') { 
                player.command.pause();
            } else if (state === 'idle') {

            }

            if (!justFetched && data.device) {
                connectedTo(data.device, data.name);
            }

            player.enable();
            player.command.play();
            
            if (data.volume && data.volume.muted) {
                player.command.mute();
            }

            connectEvents();
        } else if (data.device) {
            connectedTo(data.device);
        }
    }
    
    function handleDeviceDeselect(device) {
        views.deviceDeselectModal(device, function onDismiss(userSelectDisconnect){
            if (userSelectDisconnect) {
                disconnect();
            }
        });
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
                sessionAnnounced = false;
                return;
            }
            
            connectedDevice = deviceName;
            sessionAnnounced = true;
            
            toast.success('Connected to ' + deviceName);
            player.command.castOn(deviceName);
        });
    }
    
    function nowPlaying(data){
        if (data) {
            handleNowPlaying(data, false);
        } else if (data === false) {
            player.command.castOff();
            connectedDevice = undefined;
            sessionAnnounced = false;
        } else {
            request.json(endpoint + 'nowPlaying', function(err, data){
                if (serverError(err, data)) { return; }
                
                // check to make sure nowPlaying is not `false`
                if (data.nowPlaying) {
                    try {
                        handleNowPlaying(data.nowPlaying, true); 
                    } catch (e) {
                        console.log(e);
                    }    
                }
            });
        }
    }
    
    function playNew(url, name, thumb){
        // disabling this for now
        toast.error('Server Cast is not available');
        return;
        
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
    
    function disconnect(){
        request.json(endpoint + 'disconnect', function(err, data){
            if (serverError(err, data)) { return; }
            
            connectedDevice = undefined;
            sessionAnnounced = false;
            
            player.command.castOff();
        });
    }
    
    function deviceList(){
        request.json(endpoint + 'devices', function(err, data){
            if (data && data.success === false && data.error) {
                toast.error(data.error);
                return;
            } else if (serverError(err, data)) { 
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
        nowPlaying: nowPlaying,
        currentDevice: function(){ return connectedDevice || undefined; }
    };
}();
