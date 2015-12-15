"use strict";

var gulp       = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var uglify     = require('gulp-uglify');
var esdoc      = require("gulp-esdoc");
var source     = require('vinyl-source-stream');
var buffer     = require('vinyl-buffer');
var browserify = require('browserify');
var babelify   = require('babelify');
var bundler;

var path =
{
  release : "./build/release",
  debug   : "./build/debug"
};

var file =
{
  input : "./src/main.js",
};

var es6 =
{
  bundle          : [],
  transformPresets: [],
  transformPlugins:
  [
    "transform-es2015-modules-commonjs",
    "transform-es2015-block-scoping",
    "transform-es2015-parameters"
  ],
  output: "main.js"
};

var es6_polyfilled =
{
  bundle          : ["polyfills/typedarray.js"],
  transformPresets: [],
  transformPlugins:
  [
    "transform-es2015-modules-commonjs",
    "transform-es2015-block-scoping",
    "transform-es2015-parameters"
  ],
  output: "main.js"
};

var es5 =
{
  bundle          : [],
  transformPresets: [],
  transformPlugins:
  [
    "transform-es2015-modules-commonjs",
    "transform-es2015-block-scoping",
    "transform-es2015-parameters"
  ],
  output: "ctype.js"
};

var es5_polyfilled =
{
  bundle          : ["polyfills/typedarray.js"],
  transformPresets: [],
  transformPlugins:
  [
    "transform-es2015-modules-commonjs",
    "transform-es2015-block-scoping",
    "transform-es2015-parameters"
  ],
  output: "ctype.polyfilled.js"
};

var build =
{
  es6           : es6,
  es5           : es5,
  es5_polyfilled: es5_polyfilled,
  es6_polyfilled: es6_polyfilled
};

var docSettings =
{
  title      : "CTypeJS library",
  source     : "src",
  destination: "docs",
  includes   : ["ctype.js"],
  access     : ["private", "public", "protected"],
  autoPrivate: true
};
/**
 * Prepares library for exporting
 * @param  {[type]}  browser       [description]
 * @param  {[type]}  exportLibrary [description]
 */
function prepareExport(browser, exportLibrary)
{
  exportLibrary = exportLibrary || false;

  if(exportLibrary)
  {
    browser.bundle.push("./src/export.js");
  }
  else
  {
    browser.bundle.push(file.input);
  }
}
/**
 * Builds debug browser specific bundle
 * @param  {Object} browser Browser options object
 */
function buildDebug(browser, exportLibrary)
{
  prepareExport(browser, exportLibrary);

  bundler = browserify(browser.bundle, { debug: true })
  .transform(babelify,
  {
    plugins: browser.transformPlugins,
    presets: browser.transformPresets
  });

  bundler.bundle()
  .on("error", function(err) { console.error(err); this.emit("end"); })
  .pipe(source(browser.output))
  .pipe(buffer())
  .pipe(sourcemaps.init({ loadMaps: true }))
  .pipe(sourcemaps.write())
  .pipe(gulp.dest(path.debug));
}
/**
 * Builds release browser specific bundle
 * @param  {Object} browser Browser options object
 */
function buildRelease(browser, exportLibrary)
{
  prepareExport(browser, exportLibrary);

  bundler = browserify(browser.bundle)
  .transform(babelify,
  {
    plugins: browser.transformPlugins,
    presets: browser.transformPresets
  });

  bundler.bundle()
  .on("error", function(err) { console.error(err); this.emit("end"); })
  .pipe(source(browser.output))
  .pipe(buffer())
  .pipe(uglify())
  .pipe(gulp.dest(path.release));
}
/**
 * Generates ESDoc documentation
 */
function genDoc()
{
  gulp.src("./src")
  .pipe(esdoc(docSettings));
}

gulp.task("es6-debug",   function() { buildDebug  (build.es6, false); });
gulp.task("es6-release", function() { buildRelease(build.es6, false); });

gulp.task("es6-polyfilled-debug",   function() { buildDebug  (build.es6_polyfilled, false); });
gulp.task("es6-polyfilled-release", function() { buildRelease(build.es6_polyfilled, false); });

gulp.task("es5-release", function() { buildRelease(build.es5, true); });
gulp.task("es5-debug",   function() { buildDebug  (build.es5, true); });

gulp.task("es5-polyfilled-release", function() { buildRelease(build.es5_polyfilled, true); });
gulp.task("es5-polyfilled-debug",   function() { buildDebug  (build.es5_polyfilled, true); });

gulp.task("build-es5", ["es5-debug", "es5-release", "es5-polyfilled-debug", "es5-polyfilled-release"]);

gulp.task("doc",     genDoc);
gulp.task("watch",   ["es6-debug"], function() { gulp.watch("src/**/*.js", ["es6-debug"]); });
gulp.task("default", ["es6-debug"]);
