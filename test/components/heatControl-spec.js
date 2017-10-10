var chai = require('chai');
var expect = chai.expect; // we are using the "expect" style of Chai
var fs = require('fs');

describe('heatControl', function() {
  var heatControl;

  before(function() {
    var gpio = {
      openPinOut: function(pin, callback) { callback(); },
      closePin: function(pin, callback) { callback(); },
      write: function(pin, x, callback) { callback(); },
      writeSync: function(pin, x) {}
    };
    var rc = {
      setRelay: function(setting, callback) { callback(); }
    };
    heatControl = require('./../../src/components/heatControl')(gpio, rc);
  });

  it('getCurrentDirection should return undefined before any interaction', function() {
    var direction = heatControl.getCurrentDirection();
    expect(direction).to.be.undefined;
  });

  it('turnOn should take less than 2.2 s and finish without errors', function(done) {
    this.timeout(2200);
    var direction = heatControl.turnOn(function(err, timeToTurnOn) {
      expect(timeToTurnOn).to.be.below(2200);
      expect(err).to.be.undefined;
      done();
    });
  });

  it('max should step the engine and set direction to forward', function(done) {
    this.timeout(5000);
    heatControl.max();
    var direction = heatControl.getCurrentDirection();
    expect(direction).to.equal('forward');
    expect(heatControl.isStepping()).to.equal(true);
    expect(heatControl.stepsTaken).to.equal(0);
    setTimeout(function() {
      expect(heatControl.stepsTaken).to.equal(240);
      done();
    }, 4800);
  });

  it('min should step the engine and set direction to backward', function(done) {
    this.timeout(5000);
    heatControl.min();
    var direction = heatControl.getCurrentDirection();
    expect(direction).to.equal('backward');
    expect(heatControl.isStepping()).to.equal(true);
    expect(heatControl.stepsTaken).to.equal(0);
    setTimeout(function() {
      expect(heatControl.stepsTaken).to.equal(240);
      done();
    }, 4800);
  });

  it('turnOff should take less than 900 ms and finish without errors', function(done) {
    var direction = heatControl.turnOff(function(err, timeToTurnOn) {
      expect(timeToTurnOn).to.be.below(900);
      expect(err).to.be.undefined;
      done();
    });
  });
});