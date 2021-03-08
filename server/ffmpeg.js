/*jslint node: true */

//TODO rewrite this

var fs = require('fs');
var child_process = require('child_process');
var path = require('path');

var through = require('through2');

// root is one up from the running dir
var dir = path.resolve(__dirname, '..');

var ffmpegPath = path.resolve('.', 'bin', 'ffmpeg', 'ffmpeg.exe');
var ffprobePath = path.resolve('.', 'bin', 'ffmpeg', 'ffprobe.exe');

function thumbnail(fullPath, callback){
    var firstRead = true;

    var task = child_process.spawn(ffmpegPath, [
        '-ss', '00:01:11', '-i', fullPath,
        '-y', '-f', 'mjpeg', '-vframes', '1', '-'
    ], {
        stdio: ['ignore', 'pipe', 'pipe']
    });

    var file = through(function (chunk, enc, cb) {
        if (firstRead) {
            firstRead = false;
            callback(null, file);
        }

        cb(null, chunk);
    });

    task.stdout.pipe(file);

    task.on('exit', function (code) {
        if (firstRead) {
            firstRead = false;
            callback(new Error('exit code ' + code + ' without read'));
        }
    });

    task.on('error', function (err) {
        if (firstRead) {
            firstRead = false;
            callback(err);
        }
    });
}

function getMetaAndStream(res, vid){
	var probe = ffprobePath + ' -of json -show_streams -show_format \"' + vid + '\"';

	var metaCommand = child_process.exec(probe, function (error, stdout, stderr) {
		//console.log('stdout: ' + stdout);
		//console.log('stderr: ' + stderr);
		if (error !== null) {
			console.log('exec error: ' + error);
		}

		var metadata = JSON.parse(stdout);
		console.log('duration:', metadata.format.duration);

		stream_native(res, vid, metadata.format.duration);
	});
}

function convert(path, stream){
    var input_file = fs.createReadStream(path);

    //temp - disable console
//    var console = { log: function(){} };

	input_file.on('error', function(err) {
		console.log('input error', err);
	});

	var targetFormat = 'mp4';
	// var targetFormat = 'webm';

	var envVars = [
        '-i', 'pipe:0',
        '-f', targetFormat,

         '-vcodec', 'libx264', //used for mp4
         '-acodec', 'libmp3lame', //used for mp4

//        '-acodec', 'libvo_aacenc',
//        '-ab', '64k',
//        '-vcodec', 'libx264',
//        '-vb', '448k',
//        '-movflags', 'frag_keyframe+empty_moov',

        '-movflags', 'frag_keyframe+faststart',
        '-threads', '2',
        'pipe:1'
    ];

	var ffmpeg = child_process.spawn(ffmpegPath, envVars);

	input_file.pipe(ffmpeg.stdin);
	ffmpeg.stdout.pipe(stream);

    ffmpeg.stderr.on('data', function (data) {
		console.log(data.toString());
	});

	ffmpeg.stderr.on('end', function () {
		console.log('file has been converted succesfully');
	});

	ffmpeg.stderr.on('exit', function () {
		console.log('child process exited');
	});

	ffmpeg.stderr.on('close', function() {
		console.log('...closing time! bye');
	});
}

function stream_native(res, vid, duration){
	var input_file = fs.createReadStream(vid);

    //temp - disable console
    var console = { log: function(){} };

	input_file.on('error', function(err) {
		console.log('input error', err);
	});

	var targetFormat = 'mp4';

	res.contentType('video/' + targetFormat);
	res.setHeader('X-Content-Duration', duration.toString());

	var envVars = [
        '-i', 'pipe:0',
        '-f', targetFormat,

        '-vcodec', 'libx264', //used for mp4
        '-vb', '448k',
        '-acodec', 'libmp3lame', //used for mp4
//        '-acodec', 'libvo_aacenc', // doesn't work with ffmpeg 4
        '-ab', '64k',

        '-movflags', 'frag_keyframe+empty_moov',

//		'-movflags', 'frag_keyframe+faststart',
        '-threads', '2',
        'pipe:1'
    ];

	var ffmpeg = child_process.spawn(ffmpegPath, envVars);

	input_file.pipe(ffmpeg.stdin);
	ffmpeg.stdout.pipe(res);

	ffmpeg.stderr.on('data', function (data) {
		console.log(data.toString());
	});

	ffmpeg.stderr.on('end', function () {
		console.log('file has been converted succesfully');
	});

	ffmpeg.stderr.on('exit', function () {
		console.log('child process exited');
	});

	ffmpeg.stderr.on('close', function() {
		console.log('...closing time! bye');
	});
}

module.exports = {
    stream: function(req, res, fullPath){
        getMetaAndStream(res, fullPath);
    },
    thumb: function(fullPath, callback){
        thumbnail(fullPath, callback);
    },
    convert: function(path, stream){
        convert(path, stream);
    }
};
