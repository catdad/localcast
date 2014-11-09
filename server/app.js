/* jshint node: true */
/* global unescape */

var fs = require('./utils/fsPlus.js');
var path = require('path');
var url = require('url');

var express = require('express');
var app = express();

var proxy = require('http-proxy').createProxyServer({});

var browse = require('./browse.js');
var config = require('./config.json');
var port = config.port;

var servercast = require('./servercast.js');

// root is one up from the running dir
var rootDir = path.resolve(__dirname, '..');

function parseQuery(str){
    var query = {};
    var temp = str.split('&');
    temp.forEach(function(part){
        var q = part.split('=');
        query[q.shift()] = q.join('=');
    });
    return query;
}

//--------------
// config
//--------------

//simple logger
app.use(function(req, res, next){
    console.log(req.method, '-', req.url);
    next();
});

//--------------
// routes
//--------------

app.get('/', function(req, res){
    //browse to index
    res.sendfile(path.resolve(rootDir, 'public', 'index.html'));
});

app.get('/dir', function(req, res){
    browse.getDirStats('', function(err, data){
        res.send(err || data); 
    });
});
app.get('/virtual/:dir', function(req, res){
    browse.virtual(req.params.dir).getDirStats('', function(err, data){
        res.send(err || data); 
    });
});

app.get('/dir/*', function(req, res){
    var relativePath = decodeURIComponent(req.url).replace('/dir/', '').split('/');
    
    browse.getDirStats(path.join.apply(path, relativePath), function(err, data){
        res.send(err || data); 
    });
});
app.get('/virtual/:dir/*', function(req, res){
    var relativePath = decodeURIComponent(req.url).replace('/virtual/' + req.params.dir + '/', '').split('/');
    
    browse.virtual(req.params.dir).getDirStats(path.join.apply(path, relativePath), function(err, data){
        res.send(err || data); 
    });
});

app.get('/dirfile/*', function(req, res){
    var relativePath = decodeURIComponent(req.url).replace('/dirfile/', '').split('/');
    
    browse.stream(req, res, path.join.apply(path, relativePath));
});
app.get('/virtualfile/:dir/*', function(req, res){
    var relativePath = decodeURIComponent(req.url).replace('/virtualfile/' + req.params.dir + '/', '').split('/');
    
    browse.virtual(req.params.dir).stream(req, res, path.join.apply(path, relativePath));
});

app.get('/dirthumb/*', function(req, res){
    var relativePath = decodeURIComponent(req.url).replace('/dirthumb/', '').split('/');
    
    browse.thumb(req, res, path.join.apply(path, relativePath));
});
app.get('/virtualthumb/:dir/*', function(req, res){
    var relativePath = decodeURIComponent(req.url).replace('/virtualthumb/' + req.params.dir + '/', '').split('/');
    
    browse.virtual(req.params.dir).thumb(req, res, path.join.apply(path, relativePath));
});

//manage servercast sessions
app.get('/session/:action', function(req, res){
    var parsedUrl = url.parse(req.url),
        query = parsedUrl.query ? parseQuery(parsedUrl.query) : {},
        action = req.params.action,
        value = query.value ? unescape(query.value) : undefined;
    
    // create the arguments array to send to servercast.control
    var args = [function(err, control){
        if (err) {
            res.send({ 
                success: false, 
                error: err.message,
                action: action,
                value: value
            });
        } else {
            res.send({ 
                success: true, 
                action: action, 
                value: value 
            });
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

app.get('/gui*', function(req, res){
    proxy.web(req, res, {
        target: 'http://localhost:8050'
    });
});

//public static files
app.use(express.static(path.resolve(rootDir, 'public')));
app.use('/friendlyCast', express.static(path.resolve('.', 'friendlyCast')));

//probably requesting a directory
app.get('*', function(req, res, next){
    res.sendfile(path.resolve(rootDir, 'public', 'index.html'));
});


//--------------
// init
//--------------

app.listen(port);
console.log('port', port);