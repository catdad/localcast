/* jshint node: true, expr: true */

var fs = require('fs');

var configFile,
    configFilePath = './config.json';

// just because I feel better about it
var forEach = function forEach(obj, cb, context) {
    // check for a native forEach function
    var native = [].forEach,
        hasProp = Object.prototype.hasOwnProperty;
    
    // if there is a native function, use it
    if (native && obj.forEach === native) {
        //don't bother if there is no function
        cb && obj.forEach(cb, context);
    }
    // if the object is array-like
    else if (obj.length === +obj.length) {
        // loop though all values
        for (var i = 0, length = obj.length; i < length; i++) {
            // call the function with the context and native-like arguments
            cb && cb.call(context, obj[i], i, obj);
        }
    }
    // it's an object, use the keys
    else {
        // loop through all keys
        for (var name in obj) {
            // call the function with context and native-like arguments
            if (hasProp.call(obj, name)) {
                cb && cb.call(context, obj[name], name, obj);
            }
        }
    }
};

try {
    // get the config file synchronously this first time, so that we can require the config.js module
    configFile = require(configFilePath);
} catch (e) {
    // create a config object using default values
    configFile = {
        port: 8999,
        root : '.', //__dirname,
        virtuals : [ ]
    };
}

var config = {};

function reload(done) {
    if (typeof done !== 'function') {
        done = function() {};
    }
    
    // Read the config file again. This time, we can do async.
    var newFile = fs.readFile(configFilePath, function(err, content) {
        if (err) {
            // return an error if we got one
            // the config options have not changed
            done(err);
            return;
        }
        
        var data;
        try {
            // attempt to read the data as JSON
            data = JSON.parse(content);
        } catch (e) {
            // data is not JSON
            // the config options have not changed
            done(e);
            return;
        }
        
        // extend the original config file with the options in the new one
        forEach(data, function(value, key) {
            configFile[key] = value;
        });
        
        // rebuild the new read-only config object
        buildConfigObject();
        
        // return the newly extended config object
        done(undefined, config);
    });
}

function buildConfigObject() {
    forEach(configFile, function(value, key) {
        // only add a property if one does not exist
        if (!config[key]) {
            // make all the properties read-only
            Object.defineProperty(config, key, {
                enumerable: true,
                get: function() {
                    return configFile[key];
                }
            });
        }
    });
    
    // add the reload function, if it does not exist, as a non-enumerable property
    if (!config.reload) {
        Object.defineProperty(config, 'reload', {
            enumerable: false,
            writable: false,
            value: reload
        });
    }
}

// build the config object for the first time
buildConfigObject();

// return the read-only config object
module.exports = config;
