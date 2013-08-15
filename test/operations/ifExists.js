/* globals describe: false, it: false */

require('should');
var ifExists = require('../../src/operations').ifExists;

module.exports = describe('ifExists', function() {

  it('should call onEmpty if item is null', function(done) {
    ifExists.resolver(done, null);
  });

  it('should call onEmpty if item is undefined', function(done) {
    ifExists.resolver(done, undefined);
  });

  it('should return "" onEmpty if item is ""', function() {
    ifExists.resolver(function() { }, "").should.eql("");
  });
});
