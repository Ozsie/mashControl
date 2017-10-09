var chai = require('chai');
var expect = chai.expect; // we are using the "expect" style of Chai
var fs = require('fs');
var scheduleHandler = require('../src/scheduleHandler');

var mash;
var hwi;

describe('mash', function() {
  before(function() {
    hwi = {
      temperature: 42,
      cycleHeaterPower: function() {},
      maxEffect: function() {},
      turnOff: function(callback) { callback(); }
    };
    mash = require('./../src/runner/mash')(hwi);
  });

  after(function() {
    mash.stop();
  });

  it('status should be updated correctly', function(done) {
    var status = {step: 0, name: "", initialTemp: 0, startTime: 0, timeRemaining: 0};
    var schedule = JSON.parse(fs.readFileSync('test/mashControl-spec-schedule.json', 'utf8'));
    mash.nextMashStep(status, schedule, 0);
    setTimeout(function() {
      expect(status.step).to.equal(1);
      expect(status.stepName).to.equal('Proteinrast');
      expect(status.startTime).to.not.equal(0);
      expect(status.timeRemaining).to.equal(6000);
      mash.stop();
      done();
    }, 60);
  });

  it('temperature should be adjusted if enough time has passed', function(done) {
    var status = {step: 0, stepName: "", initialTemp: 0, startTime: Date.now(), timeRemaining: 0};
    var schedule = JSON.parse(fs.readFileSync('test/mashControl-spec-schedule.json', 'utf8'));
    schedule.startTime = Date.now() - 120000;
    scheduleHandler.setSchedule(schedule);
    mash.adjustTemperature(schedule.steps[0], schedule.volume, status, schedule);
    setTimeout(function() {
      expect(status.initialTemp).to.equal(0);
      expect(status.temperature).to.equal(42);
      expect(status.minutes).to.equal(2);
      mash.stop();
      done();
    }, 60);

  });

  it('temperature adjustment should stop if temp 90 ', function(done) {
    hwi.temperature = 91;
    var status = {step: 0, stepName: "", initialTemp: 0, startTime: Date.now(), timeRemaining: 0};
    var schedule = JSON.parse(fs.readFileSync('test/mashControl-spec-schedule.json', 'utf8'));
    schedule.startTime = Date.now() - 120000;
    mash.adjustTemperature(schedule.steps[0], schedule.volume, status, schedule);
    setTimeout(function() {
      expect(status.initialTemp).to.equal(0);
      expect(status.status).to.equal('stopped');
      expect(status.temperature).to.not.exist;
      mash.stop();
      done();
    }, 60);
  });
});