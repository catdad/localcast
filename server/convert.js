/*jslint node: true */

var path = require('path');
var fs = require('fs');

var ffmpeg = require('./ffmpeg.js');

var vidPath = process.argv[2];

if (!fs.existsSync(vidPath)){
    console.log('cannot find', vidPath);
    process.exit();
}

var filename = path.basename(vidPath).split('.').slice(0,-1).join(' ') + '12345.mp4';

var outputPath = path.resolve(path.dirname(vidPath), filename);

var output = fs.createWriteStream(outputPath);

ffmpeg.convert(outputPath, output);
