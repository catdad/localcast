/* jshint node: true */
/* global Promise */

var module = require('module');
var spawn = require('child_process').spawn;

var gulp = require('gulp');
var less = require('gulp-less');
var sourcemaps = require('gulp-sourcemaps');
var plumber = require('gulp-plumber');
var sequence = require('run-sequence');

var pkg = require('./package.json');

var server;

gulp.task('server:kill', function () {
    if (!server) {
        return;
    }

    return new Promise(function (resolve, reject) {
        server.on('close', function (code) {
            console.log('closed with code', code);

            resolve();
        });

        server.kill();

        server = null;
    });
});

gulp.task('server:start', function () {
    return new Promise(function (resolve, reject) {
        server = spawn(process.execPath, [ pkg.main ], {
            stdio: 'inherit',
            cwd: __dirname
        });

        return resolve();
    });
});

gulp.task('server', function (done) {
    sequence('server:kill', 'server:start', done);
});

gulp.task('less', function() {
    return gulp.src('./less/style.less')
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(less())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./public'));
});

gulp.task('watch', ['less', 'server'], function() {
    gulp.watch('./less/**/*.less', ['less']);
    gulp.watch('./server/**/*', ['server']);
});
