/*
 * Brandscale Templates
 * https://github.com/Brandscale/build/templates.js
 *
 * Copyright (c) 2012 Brandscale
 * Authored by Brian Woodward
 * Inspired by previous work by Jon Schlinkert
 */

module.exports = function(grunt) {

  // Grunt utilities
  var file      = grunt.file,
      log       = grunt.log,
      kindOf    = grunt.util.kindOf
      _         = grunt.util._;

  // external dependencies
  var Handlebars  = require('handlebars'),
      path        = require('path'),
      fs          = require('fs'),
      util        = require('util');

  var extensions = {
    "handlebars"  : "handlebars",
    "hbt"         : "handlebars",
    "hb"          : "handlebars",
    "handlebar"   : "handlebars",
    "mustache"    : "handlebars"
  };

  grunt.registerMultiTask('templates', 'Compile template files to HTML with specified engines', function(){

    var helpers  = require('grunt-lib-contrib').init(grunt);

    // Default project settings
    var settings = grunt.file.readJSON('tasks/settings.json');

    // Get default options from settings.json
    var defaults = settings.defaults;

    // var defaults = {
    //   layout        : '',
    //   // title         : 'Brandscale Theme',
    //   vendor        : 'Options Default',
    //   theme         : 'Options Default',
    //   tagline       : '',
    //   dev           : true,
    //   production    : false,
    //   partials      : {},
    //   data          : {},
    //
    //   setAccount    : '',
    //   setSiteId     : '',
    //   assets        : '.'
    // };


    var options = _.extend(defaults, this.data.options || {});
    logBlock("options: ", util.inspect(options));

    var data = this.data;

    // validate that the source object exists
    // and there are files at the source.
    if(!this.file.src) {
      grunt.warn('Missing src property.');
      return false;
    }
    if(this.file.src.length === 0) {
      grunt.warn('Source files not found.');
      return false;
    }
    var src = file.expandFiles(this.file.src);

    // validate that the dest object exists
    if(!this.file.dest || this.file.dest.length === 0) {
      grunt.warn('Missing dest property.');
      return false;
    }
    var dest = path.normalize(this.file.dest);

    // find an engine to use
    var engine = data.engine || options.engine || getEngineOf(src);
    if(!engine) {
      grunt.warn('No compatible engine available');
      return false;
    }

    // validate that the layout file exists
    var layout = path.normalize(options.layout);
    if(!fs.existsSync(layout)) {
      grunt.warn('Layout file (' + layout + ') not found.');
      return false;
    }

    var partials      = file.expandFiles(options.partials);
    var dataFiles     = file.expandFiles(options.data);
    var fileExt       = extension(src);
    var filenameRegex = /[^\\\/:*?"<>|\r\n]+$/i;
    var fileExtRegex  = new RegExp("\." + fileExt + "$");

    grunt.verbose.writeln(fileExtRegex);

    var done = this.async();

    // clear out the partials and data objects on options
    options.partials = {};
    options.data = {};

    // load layout
    var layoutName = _.first(layout.match(filenameRegex)).replace(fileExtRegex,'');
    layout = fs.readFileSync(layout, 'utf8');
    layout = Handlebars.compile(layout);

    // load partials if specified
    if(partials && partials.length > 0) {
      var complete = 0;
      var increment = Math.round(partials.length / 10);
      grunt.log.write(('\n' + 'Processing partials...').grey);

      partials.forEach(function(filepath) {
        var filename = _.first(filepath.match(filenameRegex)).replace(fileExtRegex, '');
        grunt.verbose.writeln(('Processing ' + filename + ' partial').cyan);
        if(complete%increment == 0) log.write('.'.cyan);

        var partial = fs.readFileSync(filepath, 'utf8');
        partial = Handlebars.compile(partial);

        // register the partial with handlebars
        Handlebars.registerPartial(filename, partial);
        complete++;
      });
      grunt.log.notverbose.writeln('\n');
    }

    // load data if specified
    if(dataFiles && dataFiles.length > 0) {
      var complete = 0;
      var increment = Math.round(dataFiles.length / 10);
      grunt.log.writeln(('\n' + 'Begin processing data...').grey);

      dataFiles.forEach(function(filepath) {
        var filename = _.first(filepath.match(filenameRegex)).replace(/\.json/,'');
        //log.writeln(('Processing ' + filename + ' data').cyan);
        if(complete%increment == 0) grunt.log.notverbose.write('.'.cyan);

        if(filename === 'data') {
          // if this is the base data.json file, load it into the options.data object directly
          options.data = _.extend(options.data || {}, grunt.file.readJSON(filepath));
        } else {
          // otherwise it's an element in options.data
          var d = grunt.file.readJSON(filepath);
          if(d[filename]) {
            // json object contains root object name so extend it in options.json
            options.data[filename] = _.extend(options.data[filename] || {}, d[filename]);
          } else {
            // add the entire object
            options.data[filename] = _.extend(options.data[filename] || {}, d);
          }
        }
        complete++;
      });
      grunt.log.writeln('\n');
      logBlock("options.data", util.inspect(options.data));
    }

    options.layout     = layout;
    options.layoutName = layoutName;

    // build each page
    grunt.log.writeln(('\n' + 'Building partials...').grey);

    var findBasePath = function(srcFiles, basePath) {
      if (basePath === false) {
        return '';
      }

      if (grunt.util.kindOf(basePath) === 'string' && basePath.length >= 1) {
        return grunt.util._(path.normalize(basePath)).trim(path.sep);
      }

      var foundPath;
      var basePaths = [];
      var dirName;

      srcFiles.forEach(function(srcFile) {
        srcFile = path.normalize(srcFile);
        dirName = path.dirname(srcFile);

        basePaths.push(dirName.split(path.sep));
      });

      basePaths = grunt.util._.intersection.apply([], basePaths);

      foundPath = path.join.apply(path, basePaths);

      if (foundPath === '.') {
        foundPath = '';
      }

      return foundPath;
    };


    var basePath = findBasePath(src, true);
    //var assetsPath = path.join(dest, options.assets);
    var assetsPath = options.assets;
    if(assetsPath === "." || assetsPath.length === 0) {
      assetsPath = dest;
    }

    src.forEach(function(srcFile) {
      srcFile  = path.normalize(srcFile);
      filename = path.basename(srcFile).replace(fileExtRegex,'');

      grunt.verbose.writeln('Reading ' + filename.magenta);

      relative = path.dirname(srcFile);
      relative = _(relative).strRight(basePath).trim(path.sep);
      relative = relative.replace(/\.\.(\/|\\)/g, '');

      destFile = path.join(dest, relative, filename + '.html');

      // setup options.assets so it's the relative path to the
      // dest assets folder from the new dest file
      options.assets = urlNormalize(
        path.relative(
          path.resolve(path.join(dest, relative)),
          path.resolve(assetsPath)
        ) + path.sep);

      grunt.verbose.writeln(('\t' + 'Src: '    + srcFile));
      grunt.verbose.writeln(('\t' + 'Dest: '   + destFile));
      grunt.verbose.writeln(('\t' + 'Assets: ' + options.assets));

      build(srcFile, filename, options, function(err, result) {
        err && grunt.warn(err) && done(false);
        if(err) return;

        file.write(destFile, result);
        grunt.log.ok('File ' + (filename + '.html').magenta + ' created.' + ' ok '.green); // ✔ doesn't work for some reason
      });

    });

    if(done) {
      done();
    }

  });

  // ==========================================================================
  // HELPERS
  // ==========================================================================
  var build = function(src, filename, options, callback) {

    var page                  = fs.readFileSync(src, 'utf8'),
        layout                = options.layout,
        context               = {};
        context.layoutName    = _(options.layoutName).humanize();
        context.pageName      = _(filename).humanize();
        context.pageName      = filename;
        // context.title         = _(filename).humanize();
        // context.vendor        = options.vendor;
        // context.theme         = options.theme;
        // context.tagline       = options.tagline;
        // context[filename]     = 'active';
        context.production    = options.production;
        context.dev           = options.dev;
        context.setAccount    = options.setAccount;
        context.setSiteId     = options.setSiteId;
        context.assets        = options.assets;

    try {
      page = Handlebars.compile(page);
      Handlebars.registerPartial("body", page);

      context = _.extend(context, options.data);
      page = layout(context);

      callback(null, page);
    } catch(err) {
      callback(err);
      return;
    };
  };

  var detectDestType = function(dest) {
    if(_.endsWith(dest, path.sep)) {
      return "directory";
    } else {
      return "file";
    }
  };

  var logBlock = function(heading, message) {
    grunt.verbose.writeln(heading.cyan);
    grunt.verbose.writeln(message);
    grunt.verbose.writeln();
  };

  var getEngineOf = function(fileName) {
    var ext = extension(fileName);
    return  _( _(extensions).keys() ).include(ext) ? extensions[ext] : false;
  };

  var extension = function(fileName) {
    grunt.verbose.writeln('extension');
    grunt.verbose.writeln(fileName);
    if(kindOf(fileName) === "array" && fileName.length > 0) {
      fileName = fileName[0];
    }
    return _(fileName.match(/[^.]*$/)).last();
  };

  var urlNormalize = function(urlString) {
    return urlString.replace(/\\/g, '/');
  };

};