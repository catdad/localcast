/* jshint node: true, -W030 */

var cast = require('chromecast-js');

var list = [],
    connectedDevice,
    lastConnectedName,
    noDeviceError = new Error('There is no connected device'),
    ttl = 1000;

function init(){
    list = [];
    
    var browser = new cast.Browser();
    
    browser.on('deviceOn', function(device){
        list.push(device);
       // console.log(device);
    });
}


var Media = function(url, title, imageUrl) {
    var m = {
        url: url,
        cover: {
            title: title || url,
            url: imageUrl || undefined
        }
    };
    return m;
};

var api = {
    /** Gets the list of devices */
    deviceList: function deviceList(cb){
        init();
        setTimeout(function(){
            console.log(list);
            cb(undefined, list);
        }, ttl);
    },
    
    /** Connects to a device */
    connect: function connect(name, cb){
        if (connectedDevice && connectedDevice.config.name === name) {
            // TODO make sure this is still connected
            cb(undefined, connectedDevice);
            return;
        }
        
        // find the matching device
        var devices = list.filter(function(dev){
            return dev.config.name === name;
        });
        
        if (devices.length) {
            connectedDevice = devices[0];
            lastConnectedName = name;
            connectedDevice.connect();
            cb(undefined, connectedDevice);
        } else {
            cb(new Error(name + ' not found'));
        }
    },
    
    /** Launches a new media session */
    launch: function launch(opts, cb){
        var error;
        if (typeof opts !== 'object') { error = new Error(opts + ' is not an options object'); }
        if (typeof opts.url !== 'string') { error = new Error(opts.url + ' is not a URL string'); }
        
        // execute the play command
        function playMedia() {
            var media = Media(opts.url, opts.title, opts.thumb);
            connectedDevice.play(media, 0, cb);
        }
        
        if (error) {
            cb(error);
            return;
        } else if (!connectedDevice) {
            // attempt to reconnect to the last used device
            if (lastConnectedName) {
                api.connect(lastConnectedName, function(err){
                    if (err) {
                        cb(noDeviceError);
                        return;
                    }
                    
                    playMedia();
                });
            } else {
                cb(noDeviceError);
            }
        } else {
            // we have a connected device, but it is possible that it timed out already
            var currentSession = api.session();
            
            // IDLE is not a good indicator of a timed-out device, but it is the state of one that is, it 
            // definitely means that nothing is playing (in this session, anyway), so we should just 
            // reconnect and skip any ugliness.
            if (currentSession && currentSession.state === 'IDLE' && !connectedDevice.player) {
                // Apparently, we cannot connect to a device that is already connected... go figure. It throws a heartbeat error.
                // Use the API connect instead... which currently does nothing, but I will update it at some point.
                
//                api.connect( currentSession.device, function(err){
//                    if (err) { 
//                        cb(err);
//                        return;
//                    }
//                    
//                    playMedia();
//                } );
                
                connectedDevice.connect();
                playMedia();
            } else {
                playMedia();    
            }
        }
    },
    
    /** Plays the current media */
    play: function play(cb){
        if (connectedDevice) connectedDevice.unpause(cb);
        else cb(noDeviceError);
    },
    
    /** Pauses the current media */
    pause: function pause(cb){
        if (connectedDevice) connectedDevice.pause(cb);
        else cb(noDeviceError);
    },
    
    /** Stops the current media */
    stop: function stop(cb){
        if (connectedDevice) connectedDevice.stop(cb);
        else cb(noDeviceError);
    },
    
    /** Seek to a particular time in the current media */
    seek: function seek(){},
    
    /** Get or set the volume */
    volume: function volume(level, cb){
        if (!connectedDevice) {
            cb(noDeviceError);
            return;
        }
        
        if (level === 'mute') {
            connectedDevice.setVolume({ muted: true }, cb);
        } else if (level === 'unmute') {
            connectedDevice.setVolume({ muted: false }, cb);
        } else if (level === +level && level >= 0 && level <= 1) {
            connectedDevice.setVolume({ level: level }, cb);
        } else {
            cb(new Error(level + ' is not a valid volume level'));
        }
    },
    
    /** Gets the duration of the current media */
    duration: function duration(){},
    
    /** Gets the current time in the current media playback */
    time: function time(){},
    
    /** Disconnects the current session */
    disconnect: function disconnect(cb){
        // how the heck do you disconnect?
        if (connectedDevice) {
            console.log(connectedDevice);
            for (var i in connectedDevice) console.log(i, '-', typeof connectedDevice[i]);
        }
        connectedDevice = undefined;
        cb();
    },
    
    /** Gets the current media session */
    session: function session(){
        var mediaData;
            
        if (connectedDevice && connectedDevice.player && connectedDevice.player.media) {
            var sessionData = connectedDevice.player.media.currentSession || false;
            var metadata = sessionData.media || {};

            // I think this is what it means
            // TODO make sure the device is still connected
            if (!sessionData) return { 
                state: 'IDLE',
                playing: false,
                device: connectedDevice.config.name
            };
            
            mediaData = {
                duration: metadata.duration,
                id: metadata.contentId,
                state: sessionData.playerState || 'UNKNOWN',
                playing: !!connectedDevice.playing,
                device: connectedDevice.config.name
            };

            if (metadata && metadata.metadata && metadata.metadata.title) {
                mediaData.name = metadata.metadata.title;
            }
        }
        
        return mediaData || false;
    },
    
    device: function getDevice(){
        return connectedDevice;
    }
};

// export the API
module.exports = api;

function routerOnError(action, err, res){
    res.send({
        success: false,
        error: err.message,
        action: action
    });
}

function routerOnSuccess(action, res){
    res.send({
        success: true,
        action: action
    });
}

function routerOnResponse(action, err, res) {
    if (err) routerOnError(action, err, res);
    else routerOnSuccess(action, res);
}

// also, just for funsies, export a router
module.exports.router = function router(action, query, res){
    switch(action) {
        case 'devices':
            api.deviceList(function(err, list){
                if (err) {
                    routerOnError(action, err, res);
                    return;
                }
                
                res.send({
                    success: true,
                    action: action,
                    list: list.map(function(dev){
                        return dev.config.name;
                    })
                });
            });
            return;
        case 'connect':
            api.connect(query.device, function(err){
                routerOnResponse(action, err, res);
            });
            return;
        case 'disconnect':
            api.disconnect(function(err){
                routerOnResponse(action, err, res);
            });
            return;
        case 'play':
            if (typeof query.url === 'string') {
                api.launch(query, function(err){
                    routerOnResponse(action, err, res);
                });
                return;
            } else {
                api.play(function(err){
                    routerOnResponse(action, err, res);
                });
            }
            return;
        case 'pause':
        case 'stop':
            api[action](function(err){
                routerOnResponse(action, err, res);
            });
            return;
        case 'volume':
            api.volume(+query.level, function(err){
                routerOnResponse(action, err, res);
            });
            return;
        case 'mute': // use the same logic as mute
        case 'unmute':
            api.volume(action, function(err){
                routerOnResponse(action, err, res);
            });
            return;
        case 'nowPlaying':
            var mediaData = api.session();
            
            res.send({ 
                success: true,
                action: action,
                nowPlaying: mediaData || false
            });
            return;
        default:
            res.send({
                success: false,
                error: action + ' is not a known command.',
                action: action
            });
    }
};
