var chai = require('chai');
var expect = chai.expect; // we are using the "expect" style of Chai
var fs = require('fs');
var scheduleHandler = require('../src/scheduleHandler');

var boil;

describe('boil', function() {
  before(function() {
    var hwi = {
      temperature: 100,
      cycleHeaterPower: function() {},
      maxEffect: function() {}
    };
    boil = require('./../src/runner/boil')(hwi);
  });

  after(function() {
    boil.stop();
  });

  it('status should be updated correctly', function(done) {
    var status = {step: 0, stepName: "", initialTemp: 0, startTime: 0, timeRemaining: 0};
    var schedule = JSON.parse(fs.readFileSync('test/mashControl-spec-schedule.json', 'utf8'));
    boil.boil(status, schedule);
    setTimeout(function() {
      expect(status.step).to.equal(3);
      expect(status.stepName).to.equal('Boil');
      expect(status.startTime).to.not.equal(0);
      expect(status.timeRemaining).to.equal(4200000);
      boil.stop();
      done();
    }, 60);
  });

  it('temperature should be adjusted if enough time has passed', function(done) {
    var status = {step: 0, stepName: "", initialTemp: 0, startTime: Date.now(), timeRemaining: 0};
    var schedule = JSON.parse(fs.readFileSync('test/mashControl-spec-schedule.json', 'utf8'));
    schedule.startTime = Date.now() - 120000;
    scheduleHandler.setSchedule(schedule);
    boil.adjustTemperatureForBoil(status, scheduleHandler.getSchedule());
    setTimeout(function() {
      expect(status.initialTemp).to.equal(0);
      expect(status.temperature).to.equal(100);
      expect(status.minutes).to.equal(2);
      boil.stop();
      done();
    }, 60);

  });
});