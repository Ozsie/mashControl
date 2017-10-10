var chai = require('chai');
var expect = chai.expect; // we are using the "expect" style of Chai
var fs = require('fs');

describe('pump', function() {
  var pump;

  before(function() {
    var rc = {
      setRelay: function(setting, callback) { callback(); },
      relayOn: function(relay, callback) { callback(); },
      relayOff: function(relay, callback) { callback(); }
    };
    pump = require('./../../src/components/pump')(rc, true);
  });

  it('isRunning should return false before starting', function() {
    expect(pump.isRunning()).to.equal(false);
  });

  it('isOn should return false before starting', function() {
    expect(pump.isOn()).to.equal(false);
  });

  it('start should start the pump', function(done) {
    pump.start(function(err, timeout) {
      expect(pump.isOn()).to.equal(true);
      expect(err).to.not.exist;
      expect(timeout).to.exist;
      done();
    });
  });

  it('pause should pause the pump', function(done) {
    pump.pause(function(err, timeout) {
      expect(pump.isRunning()).to.equal(false);
      expect(pump.isOn()).to.equal(true);
      expect(err).to.not.exist;
      expect(timeout).to.exist;
      done();
    });
  });

  it('stop should stop the pump', function(done) {
    pump.stop(function(err, doPump) {
      expect(doPump).to.equal(false);
      expect(pump.isOn()).to.equal(false);
      done();
    });
  });
});