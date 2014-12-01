/* jshint node: true */

// Adapted from Chromecast-scanner
// License: MIT
// Developer: xat

var mdns = require('mdns-js2');

var scanner = function(opts, cb) {
    if (typeof opts === 'function') {
        cb = opts;
        opts = {};
    }

    var browser = new mdns.Mdns(mdns.tcp('googlecast')),
        list = [],
        prepDevice = function prepDevice(service) {
            // make it easier for the user to
            // resolve the address.
            service.address = service.remote.address;

            return service;
        };

    var timer = setTimeout(function() {
        browser.shutdown();
        
        if (opts.all && list.length) {
            cb(undefined, list);
        } else if (opts.all && !list.length) {
            cb(new Error('No devices found.'));
        } else {
            cb(new Error('Device not found.'));
        }
    
    }, opts.ttl || 1000);

    browser.once('ready', function() {
        browser.discover();
    });
    
    browser.on('update', function(service) {
        if (opts.all) {
            
            // all it to the list and move on
            list.push(prepDevice(service));
            
        } else if (opts.device && opts.device === service.name) {
            
            // we found the device we were looking for... yay
            clearTimeout(timer);

            browser.shutdown();
            cb(null, prepDevice(service));
        }
    });
};

module.exports = {
    find: function(opts, cb) {
        if (typeof opts === 'string') opts = { device: opts };
        else opts = opts || {};
        
        scanner(opts, cb);
    },
    all: function(opts, cb) {
        opts = opts || {};
        opts.all = true;
        
        scanner(opts, cb);
    }
};