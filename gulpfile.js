/* jshint node: true, esversion: 6 */
/* global Promise */

var module = require('module');
var spawn = require('child_process').spawn;
var path = require('path');

var gulp = require('gulp');
var less = require('gulp-less');
var sourcemaps = require('gulp-sourcemaps');
var plumber = require('gulp-plumber');
var sequence = require('run-sequence');
var watchboy = require('watchboy');

var pkg = require('./package.json');

const server = ((_server) => {
    const stop = () => Promise.resolve().then(() => {
        if (!_server) {
            return;
        }

        var temp = _server;
        _server = null;

        return Promise.all([
            new Promise(function (resolve, reject) {
                temp.on('exit', function (code) {
                    resolve();
                });
            }),
            new Promise(function (resolve, reject) {
                temp.on('close', function () {
                    resolve();
                });
            }),
            new Promise(function (resolve, reject) {
                temp.kill();
                resolve();
            })
        ]);
    });

    const start = () => {
        return new Promise(function (resolve, reject) {
            _server = spawn(process.execPath, [ pkg.main ], {
                stdio: 'inherit',
                cwd: __dirname
            });

            _server.on('exit', function (code) {
                if (_server) {
                    console.log('server exited with code', code);
                    console.log('waiting for a change to restart it');
                }

                _server = null;
            });

            return resolve();
        });
    };

    return { stop, start, restart: gulp.series(stop, start) };
})(null);

const buildLess = function() {
    return gulp.src('./less/style.less')
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(less())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./build'));
};

const watch = gulp.series(buildLess, server.restart, () => {
    watchboy(['**/*.less'], { cwd: path.resolve('./less') }).on('change', () => {
        exports.build();
    });
    watchboy(['**/*'], { cwd: path.resolve('./server') }).on('change', () => {
        server.restart();
    });
});

exports.default = exports.dev = watch;
exports.build = gulp.series(buildLess);
