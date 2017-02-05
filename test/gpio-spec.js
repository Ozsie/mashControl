var chai = require('chai');
var expect = chai.expect; // we are using the "expect" style of Chai
var gpio = require('./../gpio');

describe('GPIO', function() {
  it('openPin should return error when gpio file is not available', function(done) {
    gpio.openPin(0, "out", function(err, data) {
      expect(err).to.equal("GPIO pin 0 does not exist");
      expect(data).to.be.undefined;
      done();
    });
  });

  it('closePin should return error when gpio file is not available', function(done) {
    gpio.closePin(0, function(err) {
      expect(err).to.exist;
      expect(err.errno).to.equal(-2);
      expect(err.code).to.equal('ENOENT');
      expect(err.syscall).to.equal('open');
      expect(err.path).to.equal('/sys/class/gpio/unexport');
      done();
    });
  });
});