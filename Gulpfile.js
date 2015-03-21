/* jshint node: true */

var gulp = require('gulp'),
    less = require('gulp-less'),
    sourcemaps = require('gulp-sourcemaps'),
    gutil = require('gulp-util');

gulp.task('less', function() {
    return gulp.src('./less/style.less')
        .on('error', gutil.log)
        .pipe(sourcemaps.init())
        .pipe(less())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./public'));
});

gulp.task('watch', ['less'], function() {
    gulp.watch('./less/**/*.less', ['less']);
});
