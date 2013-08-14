/* globals describe: false, it: false */

require('should');

describe('promises', function() {
  it('should pass this test', function() {
    var lol = { lol: 'rofl' };
    lol.should.have.property('lol', 'rofl');
  });
});
