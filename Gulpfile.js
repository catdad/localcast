/* jshint node: true */

var gulp = require('gulp'),
    less = require('gulp-less'),
    sourcemaps = require('gulp-sourcemaps'),
    plumber = require('gulp-plumber');

gulp.task('less', function() {
    return gulp.src('./less/style.less')
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(less())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./public'));
});

gulp.task('watch', ['less'], function() {
    gulp.watch('./less/**/*.less', ['less']);
});
