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

const server = ((_server = null, lastStart = 0) => {
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
            lastStart = Date.now();

            _server = spawn(process.execPath, [ pkg.main ], {
                stdio: 'inherit',
                cwd: __dirname
            });

            _server.on('exit', function (code) {
                if (!_server) {
                    return;
                }

                _server = null;

                console.log(`server exited with code ${code}`);

                if (Date.now() - lastStart > 15 * 1000) {
                    console.log(`it has been running for a while, so restarting immediately`);
                    restart();
                } else {
                    console.log('it crashed on startup, waiting for a change to restart it');
                }
            });

            return resolve();
        });
    };

    const restart = gulp.series(stop, start);

    return { stop, start, restart };
})();

const buildLess = () => {
    return gulp.src('./less/style.less')
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(less())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./build'));
};

const watch = () => {
    watchboy(['**/*.less'], { cwd: path.resolve('./less') }).on('change', () => {
        exports.build();
    });
    watchboy(['**/*'], { cwd: path.resolve('./server') }).on('change', () => {
        server.restart();
    });
};

exports.default = exports.dev = gulp.series(buildLess, server.restart, watch);
exports.build = gulp.series(buildLess);
