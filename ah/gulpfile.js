const concat = require('gulp-concat');
const minify = require('gulp-minify');
const gulp = require('gulp');

 
gulp.task('scripts', function() {
  return gulp.src(
        [
            './lib/*.js',
            './helper.js'
        ]
      )
    .pipe(concat('helper.js'))
    .pipe(minify())
    .pipe(gulp.dest('./dist/'));
});