/*
 * brandscale
 * http://brandscale.com/
 *
 * Copyright (c) 2012 Jon Schlinkert
 */


module.exports = function(grunt) {

  'use strict';

  var theme  = grunt.file.readJSON('config/theme.json');

  // Project configuration.
  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),
    banner: '/* \n' +
    ' * <%= pkg.name %>.js v<%= pkg.version %> by @jonschlinkert\n' +
    ' * Copyright <%= grunt.template.today("yyyy") %> <%= pkg.author %>\n' +
    ' * ================================================== */\n',

    theme: theme,

    // Import default project paths.
    path: grunt.file.readJSON(theme.paths),

    // Override default project paths with custom paths.
    defaults: {
      root: ".",
      src: "<%= defaults.root %>/src"
    },

    // Templates, build HTML docs from .mustache files
    templates: {
      options: {
        engine: "handlebars",
        language: "en-us"
      },
      project: {
        options: {
          production: false,
          dev: true,
          layout: 'src/templates/layouts/layout.mustache',
          partials: [
            'src/templates/partials/**/*.mustache',
            'src/templates/snippets/**/*.mustache'
          ],
          data:  ['src/data/*.json', 'src/templates/**/*.json'],
          assets: 'dist/assets'
        },
        files: {
          // Compile each page in the project.
          'dist': ['src/templates/pages/*.mustache']
        }
      },
      testDocs: {
        options: {
          production: false,
          dev: true,
          layout: 'src/templates/layouts/layout.mustache',
          partials:  [
            'src/templates/partials/**/*.mustache',
            'src/templates/snippets/**/*.mustache'
          ],
          data:  ['src/data/*.json', 'src/templates/**/*.json'],
          assets: 'dist/assets'
        },
        files: {
          'test/html': [
            'src/templates/pages/*.mustache'
          ]
        }
      },
      testDocsExamples: {
        options: {
          flatten: true,
          production: false,
          dev: true,
          layout: 'src/templates/layouts/layout-basic.mustache',
          data:  ['src/data/*.json', 'src/templates/**/*.json'],
          partials:  [
            'src/templates/partials/**/*.mustache',
            'src/templates/snippets/**/*.mustache'
          ],
          assets: 'dist/assets'
        },
        files: {
          'test/html/examples': ['src/templates/pages/no-layout/*.mustache']
        }
      },
      testPartials: {
        options: {
          dev: true,
          production: false,
          layout: 'src/templates/layouts/layout.mustache',
          partials:  [
            'src/templates/partials/**/*.mustache',
            'src/templates/snippets/**/*.mustache'
          ],
          data:  ['src/data/*.json', 'src/templates/**/*.json'],
          assets: 'dist/assets'
        },
        files: {
          'test/html/components': ['src/templates/partials/**/*.mustache']
        }
      }
    },

    watch: {
      lib: {
        files: [
          'src/templates/pages',
          'src/templates/partials',
          'src/templates/snippets',
          'src/templates/layouts'
        ],
        tasks: ['nodeunit']
      }
    },

    subgrunt: {
      themes: ['themes/**/Gruntfile.js']
    }

  });

  // Load npm plugins to provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-handlebars');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-recess'); // broken due to changes in grunt v0.4.0, temporarily pulling from forked (and fixed) repo

  // Load local tasks.
  grunt.loadTasks('tasks');

  // Default task.
  grunt.registerTask('default', [
    'templates'
  ]);


  // Run sub-grunt files in all projects.
  grunt.registerMultiTask('subgrunt', 'Run a sub-gruntfile.', function() {
    var path = require('path');
    var files = grunt.file.expandFiles(this.file.src);
    grunt.util.async.forEachSeries(files, function(gruntfile, next) {
      grunt.util.spawn({
        grunt: true,
        args: ['--gruntfile', path.resolve(gruntfile)]
      }, function(error, result) {
        if (error) {
          grunt.log.error(result.stdout).writeln();
          next(new Error('Error running sub-gruntfile "' + gruntfile + '".'));
        } else {
          grunt.verbose.ok(result.stdout);
          next();
        }
      });
    }, this.async());
  });
};
