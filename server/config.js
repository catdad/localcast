/* jshint node: true */

var fs = require('fs');

var _ = require('lodash');

var configFilePath = './config.json';
var configFile;

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
            return done(err);
        }

        var data;
        try {
            // attempt to read the data as JSON
            data = JSON.parse(content);
        } catch (e) {
            // data is not JSON
            // the config options have not changed
            return done(e);
        }

        // extend the original config file with the options in the new one
        _.forEach(data, function(value, key) {
            configFile[key] = value;
        });

        // rebuild the new read-only config object
        buildConfigObject();

        // return the newly extended config object
        return done(null, config);
    });
}

function buildConfigObject() {
    _.forEach(configFile, function(value, key) {
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
