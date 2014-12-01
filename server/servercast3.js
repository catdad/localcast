/* jshint node: true, -W030 */

var cast = require('./castBrowser.js');
var player = require('chromecast-player')();

var noop = function(){};

var opts = {
    device: undefined,
    ttl: 500
};

var error = {
        noDeviceConnected: new Error('There is no connected device.'),
        noDeviceFound: new Error('No devices were found.')
    };

function getDevices(cb) {
    
    cast.all({
        ttl: opts.ttl
    }, function(err, list){
        if (err) {
            cb(error.noDeviceFound);
            return;
        }
        
        console.log(list);
        
        cb(undefined, list);
    });
}

var MediaOpts = function(url, title, imageUrl) {
    var metadata = {
        type: 0,
        metadataType: 0,
        title: title,
        images: [
            { url: imageUrl }
        ]
    };
    
    var mediaOpts = {
        path: url,
        device: opts.device,
        ttl: opts.ttl,
        media: { metadata: metadata }
    };
    
    return mediaOpts;
};

var api = {
    lastDeviceList: [],
    lastPlayer: undefined,
    lastMedia: undefined,
    
    /** Gets the list of devices */
    deviceList: function deviceList(cb){
        getDevices(function(err, list){
            // save the list
            if (list && list.length) api.lastDeviceList = list;
            
            cb(err, list);
        });
    },
    
    /** Connects to a device -- not really, but sort of */
    connect: function connect(name, cb){
        // find the matching device
        var device = api.lastDeviceList.filter(function(dev){
            return dev.name === name;
        })[0];
        
        if (device) {
            // save the name in the options object
            // that's all we really need to do right now
            opts.device = name;
            cb(undefined, device);
        } else {
            cb(new Error(name + ' not found'));
        }
    },
    
    /** Launches a new media session */
    launch: function launch(localOpts, cb){
        
        var media = MediaOpts(localOpts.url, localOpts.title, localOpts.thumb);
        api.lastMedia = media;
        
        player.launch(media, function(err, p){
            if (err) {
                cb(err);
                return;
            }

            p.once('playing', function(){
                api.lastPlayer = p;
                cb();
            });
        });
    },
    
    /** Plays the current media */
    play: function play(cb){
        if (api.lastPlayer) {
            api.lastPlayer.play();
            cb();
        }
        else cb(error.noDeviceConnected);
    },
    
    /** Pauses the current media */
    pause: function pause(cb){
        if (api.lastPlayer) {
            api.lastPlayer.pause();
            cb();
        }
        else cb(error.noDeviceConnected);
    },
    
    /** Stops the current media */
    stop: function stop(cb){
        if (api.lastPlayer) {
            api.lastPlayer.stop();
            
            api.lastMedia = undefined;
            
            cb();
        }
        else cb(error.noDeviceConnected);
    },
    
    /** Seek to a particular time in the current media */
    seek: function seek(){},
    
    /** Get or set the volume */
    volume: function volume(level, cb){
        if (api.lastPlayer) {
            if (level === 'mute') {
                api.lastPlayer.mute();
                cb();
            } else if (level === 'unmute') {
                api.lastPlayer.unmute();
                cb();
            } else if (level === +level && level >= 0 && level <= 1) {
                cb();
            } else {
                cb(new Error(level + ' is not a valid volume level'));
            }
        } else cb(error.noDeviceConnected);
    },
    
    /** Gets the duration of the current media */
    duration: function duration(){},
    
    /** Gets the current time in the current media playback */
    time: function time(){},
    
    /** Disconnects the current session */
    disconnect: function disconnect(cb){
        // this one is not actually asynchronous, so it doesn't matter right now
        api.stop(noop);
        api.lastPlayer = undefined;
        
        opts.device = undefined;
        cb();
    },
    
    /** Gets the current media session */
    session: function session(){
        var mediaData = {
            device: opts.device,
            playing: false
        };
        
        if (api.lastPlayer) {
            var sessionData = api.lastPlayer.currentSession || {};
            var media = sessionData.media || api.lastMedia;
            
            // save it, in case we gained some useful tidbits
            // we will have more data if the playerState is PLAYING
            api.lastMedia = media;
            
            if (sessionData.playerState === 'IDLE') {
                var reason = sessionData.idleReason.toLowerCase();
            
                if (reason === 'cancelled' || reason === 'finished') {
                    return mediaData;    
                }
            }
            
            mediaData = {
                duration: media.duration,
                id: media.contentId,
                state: sessionData.playerState || 'UNKNOWN',
                playing: true,
                volume: sessionData.volume,
                device: opts.device
            };

            if (media && media.metadata && media.metadata.title) {
                mediaData.name = media.metadata.title;
            }
        }
        
        return mediaData;
    },
    
    /** Gets the name of the currently used device */
    device: function getDevice(){
        return opts.device;
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
                        return dev.name;
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
