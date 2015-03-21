/* jshint node: true */

var gulp = require('gulp'),
    less = require('gulp-less'),
    sourcemaps = require('gulp-sourcemaps'),
    gutil = require('gulp-util');

gulp.task('less', function() {
    return gulp.src('./less/style.less')
        .pipe(sourcemaps.init())
        .pipe(less())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./public'))
        .on('error', gutil.log);
});

gulp.task('watch', ['less'], function() {
    gulp.watch('./less/**/*.less', ['less']);
});
