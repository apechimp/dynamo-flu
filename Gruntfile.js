module.exports = function (grunt) {
  var js_files = ['Gruntfile.js', 'src/*.js', 'index.js', 'test/*.js'];

  grunt.initConfig({
    jshint: {
      jshintrc: '.jshintrc',
      all: js_files
    },
    simplemocha: {
      options: {
        timeout: 200,
        ignoreLeaks: false,
        ui: 'bdd',
        reporter: 'nyan'
      },
      all: {
        src: ['test/*.js']
      }
    },
    watch: {
      options: { livereload: true },
      files: js_files,
      tasks: ['jshint', 'simplemocha']
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-simple-mocha');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('default', ['watch']);
  grunt.registerTask('test', ['jshint', 'simplemocha']);
};
