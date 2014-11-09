/* jshint node: true, -W030 */

var player = require('chromecast-player')();

var globalPlayer;

function launchPlayer (media, callback) {
    player.launch(media, function(err, p) {
        if (err) {
            callback(err);
            return;
        }
        
        p.once('playing', function(){
            console.log('media is playing');
            callback(undefined, p);
        });
    });
}

function playerAction(name, callback, args) {
    args = (args instanceof Array) ? args :
           (args !== undefined) ? [args] : [];
    
    if (globalPlayer) {
        globalPlayer[name].apply(globalPlayer, args);
        callback && callback(undefined, Control);
    } else {
        callback && callback( new Error('nothing to ' + name) );
    }
    
}

var Control = {
    play: function(callback, url) {
        if (url) {
            launchPlayer(url, function(err, p){
                // save the instance of the player object
                globalPlayer = p;
                callback && callback(err, Control);
            });    
        } else {
            playerAction('play', callback);
        }
    },
    pause: function(callback) {
        if (globalPlayer) {
            globalPlayer.pause();
            callback && callback();
        } else {
            callback && callback( new Error('nothing to pause') );
        }
    },
    seek: function(callback, seconds) {
        playerAction('seek', callback, seconds);
    },
    volume: function(callback, level) {
        if (level === 'mute' || level === 'unmute') {
            playerAction(level, callback);
        } else if (level === +level) {
            
        }
    },
    mute: function(callback){
        playerAction('mute', callback);
    },
    unmute: function(callback){
        playerAction('unmute', callback);
    },
    duration: function() {
        return globalPlayer ? globalPlayer.duration : undefined;
    },
    time: function() {
        return globalPlayer ? globalPlayer.currentTimte : undefined;
    }
};

module.exports = {
    control: Control,
    startCast: function(url, opts){
        opts.title = opts.title || url;
        
        playerAction('play', undefined, url);
        return this;
    }
};