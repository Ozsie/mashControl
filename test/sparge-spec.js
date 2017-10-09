var chai = require('chai');
var expect = chai.expect; // we are using the "expect" style of Chai
var fs = require('fs');

var sparge;
var hwi;

describe('sparge', function() {
  before(function() {
    hwi = {
      temperature: 78,
      cycleHeaterPower: function() {},
      maxEffect: function() {},
      turnOff: function(callback) { callback(); }
    };
    sparge = require('./../src/runner/sparge')(hwi);
  });

  after(function() {
    sparge.stop();
  });

  it('status should be updated correctly', function(done) {
    var status = {step: 0, name: "", initialTemp: 0, startTime: 0, timeRemaining: 0};
    var schedule = JSON.parse(fs.readFileSync('test/mashControl-spec-schedule.json', 'utf8'));
    sparge.spargePause(status, schedule);
    setTimeout(function() {
      expect(status.step).to.equal(2);
      expect(status.stepName).to.equal('Sparge Pause');
      expect(status.startTime).to.not.equal(0);
      expect(status.timeRemaining).to.equal(1200);
      sparge.stop();
      done();
    }, 60);
  });
});