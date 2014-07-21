/*jslint node: true */

var fs = require('./utils/fsPlus.js');
var path = require('path');

var express = require('express');
var app = express();

var browse = require('./browse.js');
var config = require('./config.json');
var port = config.port;

//--------------
// config
//--------------

//simple logger
app.use(function(req, res, next){
    console.log(req.url);
    next();
});

//--------------
// routes
//--------------

app.get('/', function(req, res){
    //browse to index
    res.sendfile(path.resolve(__dirname, 'public', 'index.html'));
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



//public static files
app.use(express.static(path.resolve(__dirname, 'public')));
app.use('/friendlyCast', express.static(path.resolve('.', 'friendlyCast')));

//probably requesting a directory
app.get('*', function(req, res, next){
    res.sendfile(path.resolve(__dirname, 'public', 'index.html'));
});



//--------------
// init
//--------------

app.listen(port);
console.log('port', port);