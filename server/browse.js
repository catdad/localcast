/*jslint node: true, expr: true */

var path = require('path');
var url = require('url');
var send = require('send');

var fs = require('./utils/fsPlus.js');
var ip = require('./ip.js');
var ffmpeg = require('./ffmpeg.js');

var config = require('./config.js');
var globalRoot = config.root;

var urlRoot = '';

//*******************
// common functions
//*******************

function getRootUrl() {
    return 'http://' + ip() + ':' + config.port;
}

function getDirectoryStats(root, fullPath, prefix, prefixfile, prefixthumb, callback) {
    //get virtual folders only if browsing the root
    var getVirtuals = (fullPath === globalRoot);

    fs.dirStats(fullPath, function cb(err, data) {
        var virtuals = [];
        if (getVirtuals) {
            virtuals = config.virtuals.map(function(el) {
                var virtualEl = {};
                virtualEl.name = el.name;
                virtualEl.path = path.join('virtual', el.name);
                virtualEl.isVirtual = true;
                return virtualEl;
            });
        }

        if (err) callback(err);
        else callback(null, {
            //add some context
            path: path.join(prefix, path.relative(root, fullPath)).split(path.sep).join('/'),
            sep: path.sep,

            //process data
            files: data.map(function map(el) {
                //remove the root
                var relPath = path.relative(root, el.path);

                if (el.isFile) {
                    el.path = path.join(prefixfile, relPath).split(path.sep).join('/');
                    el.format = el.name.split('.').pop();
                    //TODO clean this up
                    el.resource = url.resolve(getRootUrl(), el.path.split(path.sep).join('/'));
                    el.thumb = url.resolve(getRootUrl(), path.join(prefixthumb, relPath).split(path.sep).join('/'));
                } else {
                    el.path = path.join(prefix, relPath).split(path.sep).join('/');
                }

                return el;
            }).concat(virtuals).sort(function(a, b) {
                //alphabetize
                return (a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase()) ? -1 : 1;
            })
        });
    });
}

function streamFile(req, res, fullPath) {
    function initStream() {
        //like I was really going to ever do this myself...
        send(req, fullPath)
            .on('error', function(ev) {
                console.log('steam file error', ev);
            })
            .on('directory', function(ev) {
                console.log('stream file directory', ev);
            })
            .pipe(res);
    }

    fs.exists(fullPath, function(exists) {
        if (exists) initStream();
        else {
            res.status(404).send('Not found');
            return;
        }
    });
}

function getThumbnail(req, res, fullPath, callback) {
    ffmpeg.thumb(fullPath, function(err, img) {
        res.writeHead(200, {'Content-Type': 'image/jpeg'});

        if (err) {
            console.error('error generating thumbnail', err);

            var pathToRead = path.resolve('.', 'temp', 'error.jpg');
            fs.createReadStream(pathToRead).pipe(res);

            return;
        }

        img.pipe(res);
    });
}

function ffmpegStream(req, res, fullPath) {
    ffmpeg.stream(req, res, fullPath);
}

//*******************
// browse constructor
//*******************

var Browser = function(root, prefix) {
    //set the root inside scope
    this.root = root;
    this.prefix = prefix;

    this.getPrefix = function(type) {
        return this.prefix.replace('{{file}}', (type || ''));
    };

    this.getDirStats = function(dir, callback) {
        var fullPath = path.resolve(this.root, dir);

        getDirectoryStats(this.root, fullPath, this.getPrefix(), this.getPrefix('file'), this.getPrefix('thumb'), callback);
    };

    this.stream = function(req, res, relativePath) {
        var fullPath = path.resolve(this.root, relativePath);

        //get file format
        var format = fullPath.split('.').pop();

        if (format === 'mp4' || format === 'webm') {
            return streamFile(req, res, fullPath);
        }

        return ffmpegStream(req, res, fullPath);
    };

    this.thumb = function(req, res, relativePath) {
        var fullPath = path.resolve(this.root, relativePath);

        getThumbnail(req, res, fullPath);
    };

    this.virtual = function(name) {
        var virtual = config.virtuals.filter(function(el) {
            return (el.name === name);
        });

        var newRoot = '.'; //assume current directory
        if (virtual.length) {
            newRoot = virtual[0].directory;
        }

        return new Browser(newRoot, path.join('virtual{{file}}', name));
    };
};

//*******************
// assign exports
//*******************

module.exports = new Browser(config.root, 'dir{{file}}');
