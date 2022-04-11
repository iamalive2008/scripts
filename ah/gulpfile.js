const concat = require('gulp-concat');
const minify = require('gulp-minify');
const gulp = require('gulp');

 
gulp.task('scripts', function() {
  return gulp.src(
        [
            './lib/react.development.js',
            './lib/react-dom.development.js',
            './lib/react-dom-test-utils.development.js',
            './lib/testing-library-react.js',
            './lib/jquery.js',
            './lib/touchRobot/dist/touch-robot.min.js',
            './helper.js',
        ]
      )
    .pipe(concat('scripts.js'))
    .pipe(minify())
    .pipe(gulp.dest('./dist/'));
});
