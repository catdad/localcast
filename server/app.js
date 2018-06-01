/* jshint node: true */
/* global unescape */

var fs = require('./utils/fsPlus.js');
var path = require('path');
var url = require('url');

var express = require('express');
var app = express();

var proxy = require('http-proxy').createProxyServer({});
var qr = require('qr-image');

var browse = require('./browse.js');
var config = require('./config.js');
var port = config.port;

var servercast = require('./servercast.js');
//var servercast2 = require('./servercast2.js');
var servercast3 = require('./servercast3.js');
var servercast4 = require('./servercast4.js');
var ip = require('./ip.js');

// set the process title to the package name
var package = require('./../package.json');
process.title = package.name;

// root is one up from the running dir
var rootDir = path.resolve(__dirname, '..');

function parseQuery(str) {
    var query = {};
    var temp = str.split('&');
    temp.forEach(function (part) {
        var q = part.split('=');
        query[q.shift()] = q.join('=');
    });
    return query;
}

//--------------
// config
//--------------

//simple logger
app.use(function(req, res, next) {
    console.log(req.method, '-', req.url);
    next();
});

//--------------
// routes
//--------------

app.get('/', function(req, res) {
    //browse to index
    res.sendfile(path.resolve(rootDir, 'public', 'index.html'));
});

function send(res, err, data) {
    data = data || {};
    data.nowPlaying = servercast3.session();
    
    res.send(err || data);
}

app.get('/dir', function(req, res) {
    browse.getDirStats('', function(err, data) {
        send(res, err, data);
    });
});
app.get('/virtual/:dir', function(req, res) {
    browse.virtual(req.params.dir).getDirStats('', function(err, data) {
        send(res, err, data);
    });
});

app.get('/dir/*', function(req, res) {
    var relativePath = decodeURIComponent(req.url).replace('/dir/', '').split('/');
    
    browse.getDirStats(path.join.apply(path, relativePath), function(err, data) {
        send(res, err, data);
    });
});
app.get('/virtual/:dir/*', function(req, res) {
    var relativePath = decodeURIComponent(req.url)
        .replace('/virtual/' + req.params.dir + '/', '')
        .split('/');
    
    browse.virtual(req.params.dir).getDirStats(path.join.apply(path, relativePath), function(err, data) {
        send(res, err, data);
    });
});

app.get('/dirfile/*', function(req, res) {
    var relativePath = decodeURIComponent(req.url).replace('/dirfile/', '').split('/');
    
    browse.stream(req, res, path.join.apply(path, relativePath));
});
app.get('/virtualfile/:dir/*', function(req, res) {
    var relativePath = decodeURIComponent(req.url)
        .replace('/virtualfile/' + req.params.dir + '/', '')
        .split('/');
    
    browse.virtual(req.params.dir).stream(req, res, path.join.apply(path, relativePath));
});

app.get('/dirthumb/*', function(req, res) {
    var relativePath = decodeURIComponent(req.url).replace('/dirthumb/', '').split('/');
    
    browse.thumb(req, res, path.join.apply(path, relativePath));
});
app.get('/virtualthumb/:dir/*', function(req, res) {
    var relativePath = decodeURIComponent(req.url)
        .replace('/virtualthumb/' + req.params.dir + '/', '')
        .split('/');
    
    browse.virtual(req.params.dir).thumb(req, res, path.join.apply(path, relativePath));
});

app.post('/cast', function (req, res) {
    servercast4(req, res);
});

// router the servercast module
app.get('/session2/:action', function(req, res) {
    servercast3.router(req.params.action, req.query, res);
});

//manage servercast sessions
app.get('/session/:action', function(req, res) {
    var parsedUrl = url.parse(req.url);
    var query = parsedUrl.query ? parseQuery(parsedUrl.query) : {};
    var action = req.params.action;
    var value = query.value ? unescape(query.value) : undefined;
    
    // create the arguments array to send to servercast.control
    var args = [function(err, control) {
        if (err) {
            res.send({
                success: false,
                error: err.message,
                action: action,
                value: value
            });
        } else {
            var response = {
                success: true,
                action: action,
                value: value
            };
            
            if (action === 'nowPlaying') {
                response.nowPlaying = control;
            }
            
            res.send(response);
        }
    }, value];
    
    // get the control method to call
    var method = servercast.control[action];
    
    if (method) {
        method.apply(servercast.control, args);
    } else {
        res.send({
            success: false,
            error: action + ' is not valid',
            action: action,
            value: value
        });
    }
});

app.get('/gui*', function(req, res) {
    proxy.web(req, res, {
        target: 'http://localhost:8050'
    });
});

//public static files
app.use(express.static(path.resolve(rootDir, 'public')));
app.use(express.static(path.resolve(rootDir, 'build')));
app.use('/friendlyCast', express.static(path.resolve('.', 'friendlyCast')));
app.use('/lib/octicons', express.static(path.resolve('.', 'lib/octicons')));

// generate links to the home page inside the local network
app.get('/link', function(req, res) {
    var format = (req.query.f || 'png').toLowerCase();
    var address = 'http://' + ip() + ':' + port;
    
    if (format === 'json') {
        res.send({url: address});
        return;
    }
    
    if (format !== 'pdf' && format !== 'svg') {
        format = 'png';
    }
    
    var code = qr.image(address, {type: format});
    res.type(format);
    code.pipe(res);
});

//probably requesting a directory
app.get('*', function(req, res, next) {
    res.sendfile(path.resolve(rootDir, 'public', 'index.html'));
});

//--------------
// init
//--------------

app.listen(port);
console.log('listening at', ip() + ':' + port);
