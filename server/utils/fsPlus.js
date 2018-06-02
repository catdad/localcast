/*jslint node: true */

var fs = require("fs");
var path = require("path");

var dirStats = function getDir(dir, callback){
    fs.readdir(dir, function(err, data){
        if (err) {
            callback(err);
            return;
        }

        var stats = [];
        data.forEach(function(el, i, arr){
            var thisPath = path.resolve(dir, el);
            var thisStat = fs.statSync( thisPath );
            stats.push({
                name: el,
                path: thisPath,
                isFile: thisStat.isFile(),
                isDirectory: thisStat.isDirectory()
            });
        });

        callback(null, stats);
    });
};

//set exports to fs
module.exports = fs;

//add to fs
module.exports.dirStats = dirStats;
