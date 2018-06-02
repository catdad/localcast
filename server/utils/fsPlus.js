/*jslint node: true */

var fs = require("fs");
var path = require("path");
var sync = require("./sync.js");

var dirDeprecated = function(dirPath, callback){
	//store directories and files
	var dirs = [];
	var files = [];

	//get everything in desired path
	fs.readdir(dirPath, function(err, data){
		//store functions that need synchronication
		var syncFunctions = [];

		data.forEach(function(el, i, arr){
			//create async function
			var asyncFunc = function(next){
				//get stats on each item
				fs.stat(path.join(dirPath, el), function(err, stat){
					if (err || !stat){
						//console.log(err || "unknown stat error");
					} else{
						if (stat.isFile()) files.push(el);
						else if (stat.isDirectory()) dirs.push(el);
					}
					next();
				});
			};

			syncFunctions.push(asyncFunc);
		});

		sync(syncFunctions, function(){
			console.log("finished!");
			callback(null, { dirs: dirs, files: files });
		}); /* */
	});
};

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
module.exports.dirPlus = dirDeprecated;
module.exports.dirStats = dirStats;
