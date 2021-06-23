let project_folder = require('path').basename(__dirname);
let source_folder = '#src';
let fs = require('fs');

let path = {
  build: {
    html: project_folder + '/',
    css: project_folder + '/css/',
    js: project_folder + '/js/',
    img: project_folder + '/img/',
    fonts: project_folder + '/fonts/',
  },
  src: {
    html: [source_folder + '/*.html', '!' + source_folder + '/_*.html'],
    css: source_folder + '/scss/style.scss',
    js: source_folder + '/js/script.js',
    img: [
      source_folder + '/img/**/*.+(png|jpg|gif|ico|svg|webp)',
      '!' + source_folder + '/img/icon-*.+(svg|png)',
    ],
    fonts: source_folder + '/fonts/**/*.+(woff|woff2|ttf)',
  },
  watch: {
    html: source_folder + '/**/*.html',
    css: source_folder + '/scss/**/*.scss',
    js: source_folder + '/js/**/*.js',
    img: source_folder + '/img/**/*.+(png|jpg|gif|ico|svg|webp)',
  },
  clean: './' + project_folder + '/',
};

let { src, dest } = require('gulp'),
  gulp = require('gulp'),
  browsersync = require('browser-sync').create(),
  fileinclude = require('gulp-file-include'),
  del = require('del'),
  scss = require('gulp-sass'),
  autoprefixer = require('gulp-autoprefixer'),
  group_media = require('gulp-group-css-media-queries'),
  clean_css = require('gulp-clean-css'),
  rename = require('gulp-rename'),
  uglify = require('gulp-uglify-es').default,
  imagemin = require('gulp-imagemin'),
  webp = require('gulp-webp'),
  webphtml = require('gulp-webp-html'),
  webp_css = require('gulp-webp-css'),
  spritesmith = require('gulp.spritesmith'),
  merge = require('merge-stream'),
  svgSprite = require('gulp-svg-sprite'),
  ttf2woff = require('gulp-ttf2woff'),
  ttf2woff2 = require('gulp-ttf2woff2'),
  notify = require('gulp-notify'),
  plumber = require('gulp-plumber'),
  pngquant = require('imagemin-pngquant'),
  cache = require('gulp-cache');

function browserSync(params) {
  browsersync.init({
    server: {
      baseDir: './' + project_folder + '/',
    },
    port: 3000,
    notify: false,
  });
}

function html() {
  return src(path.src.html)
    .pipe(fileinclude())
    .pipe(webphtml())
    .pipe(dest(path.build.html))
    .pipe(browsersync.stream());
}

function css() {
  return src(path.src.css)
    .pipe(
      plumber({
        errorHandler: notify.onError(function (err) {
          return {
            title: 'Styles',
            message: err.message,
          };
        }),
      })
    )
    .pipe(
      scss({
        outputStyle: 'expanded',
      })
    )
    .pipe(group_media())
    .pipe(
      autoprefixer({
        overrideBrowserslist: ['last 5 version'],
        cascade: true,
      })
    )
    .pipe(webp_css())
    .pipe(dest(path.build.css))
    .pipe(clean_css())
    .pipe(
      rename({
        extname: '.min.css',
      })
    )
    .pipe(dest(path.build.css))
    .pipe(browsersync.stream());
}

function js() {
  return src(path.src.js)
    .pipe(fileinclude())
    .pipe(dest(path.build.js))
    .pipe(uglify())
    .pipe(
      rename({
        extname: '.min.js',
      })
    )
    .pipe(dest(path.build.js))
    .pipe(browsersync.stream());
}

function images() {
  return src(path.src.img)
    .pipe(
      cache(
        imagemin(
          [
            imagemin.gifsicle({ interlaced: true }),
            imagemin.mozjpeg({ quality: 70, progressive: true }),
            imagemin.optipng({ optimizationLevel: 3 }),
            pngquant({ quality: [0.7, 0.8], steed: 5 }),
            imagemin.svgo({
              plugins: [
                { optimizationLevel: 3 },
                { progessive: true },
                { interlaced: true },
                { removeViewBox: false },
                { removeUselessStrokeAndFill: false },
                { cleanupIDs: false },
              ],
            }),
          ],
          {
            verbose: true,
          }
        )
      )
    )
    .pipe(dest(path.build.img))
    .pipe(
      webp({
        quality: 70,
      })
    )
    .pipe(dest(path.build.img))
    .pipe(browsersync.stream());
}

function fonts() {
  src(path.src.fonts).pipe(ttf2woff()).pipe(dest(path.build.fonts));
  return src(path.src.fonts).pipe(ttf2woff2()).pipe(dest(path.build.fonts));
}

function fontsStyle(params) {
  let file_content = fs.readFileSync(source_folder + '/scss/fonts.scss');
  fs.writeFile(source_folder + '/scss/fonts.scss', '', cb);
  return fs.readdir(path.build.fonts, function (err, items) {
    if (items) {
      let c_fontname;
      for (var i = 0; i < items.length; i++) {
        let fontnames = items[i].split('-');
        fontnames = fontnames[0] + '-' + fontnames[1];
        let fontname = items[i].split('.');
        fontname = fontname[0];
        if (c_fontname != fontname) {
          fs.appendFile(
            source_folder + '/scss/fonts.scss',
            '@include font("' +
              fontnames +
              '", "' +
              fontname +
              '", "400", "normal");\r\n',
            cb
          );
        }
        c_fontname = fontname;
      }
    }
  });
}

function cb() {}

gulp.task('svgSprite', function () {
  return gulp
    .src([source_folder + '/img/icon-*.svg'])
    .pipe(
      svgSprite({
        mode: {
          stack: {
            sprite: '../sprite.svg',
          },
        },
      })
    )
    .pipe(dest(source_folder + '/img/'));
});

gulp.task('pngSprite', function () {
  var spriteData = gulp.src([source_folder + '/img/icon-*.png']).pipe(
    spritesmith({
      imgName: 'sprite.png',
      imgPath: '/img/sprite.png',
      cssName: 'sprite-png.scss',
      padding: 5,
    })
  );
  var imgStream = spriteData.img.pipe(dest(source_folder + '/img/'));
  var cssStream = spriteData.css.pipe(gulp.dest(source_folder + '/scss/'));
  return merge(imgStream, cssStream);
});

gulp.task('clear', function (done) {
  return cache.clearAll(done);
});

function watchFiles(params) {
  gulp.watch([path.watch.html], html);
  gulp.watch([path.watch.css], css);
  gulp.watch([path.watch.js], js);
  gulp.watch([path.watch.img], images);
}

function clean(params) {
  return del(path.clean);
}

let build = gulp.series(
  clean,
  gulp.parallel(js, css, html, images, fonts),
  fontsStyle
);
let watch = gulp.parallel(build, browserSync, watchFiles);

exports.fontsStyle = fontsStyle;
exports.fonts = fonts;
exports.images = images;
exports.js = js;
exports.css = css;
exports.html = html;
exports.build = build;
exports.watch = watch;
exports.default = watch;
