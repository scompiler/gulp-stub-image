const gulp = require('gulp');
const gulpStubImage = require('./index');
const del = require('del');

function clean() {
    return del('result');
}

function stub() {
    return gulp.src('images/**/*').pipe(gulpStubImage()).pipe(gulp.dest('result'));
}

exports.default = gulp.series(clean, stub);
