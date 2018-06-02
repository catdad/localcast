/*jslint node: true */

var fs = require("fs");
var path = require("path");

function statSeries(dir, data, done) {
    var stats = [];

    function statPromise(filePath) {
        return new Promise(function (resolve, reject) {
            fs.stat(filePath, function (err, stat) {
                if (err) {
                    return reject(err);
                }

                return resolve(stat);
            });
        });
    }

    data.reduce(function (prom, el) {
        var thisPath = path.resolve(dir, el);

        return prom.then(function () {
            return statPromise(thisPath).then(function (stat) {
                stats.push({
                    name: el,
                    path: thisPath,
                    isFile: stat.isFile(),
                    isDirectory: stat.isDirectory()
                });
            });
        });
    }, Promise.resolve()).then(function () {
        done(null, stats);
    }).catch(function (err) {
        done(err);
    });
}

var dirStats = function getDir(dir, callback){
    fs.readdir(dir, function(err, data){
        if (err) {
            return callback(err);
        }

        statSeries(dir, data, callback);
    });
};

//set exports to fs
module.exports = fs;

//add to fs
module.exports.dirStats = dirStats;
