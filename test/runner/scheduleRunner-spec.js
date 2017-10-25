var chai = require('chai');
var expect = chai.expect; // we are using the "expect" style of Chai
var fs = require('fs');


describe('scheduleRunner', function() {
  var scheduleRunner;
  var scheduleHandler = require('../../src/scheduleHandler');
  var hwStatus = {motor: true, pump: true};

  before(function() {
    var hwi = {
      temperature: 100,
      cycleHeaterPower: function() {},
      maxEffect: function() {},
      turnOn: function(callback) { callback(undefined, hwStatus); },
      turnOff: function(callback) { callback(undefined, true); },
      stopPump: function(callback) { callback(); },
      heaterOnSwitch: function(callback) { callback(); }
    };
    scheduleHandler.clear();
    scheduleRunner = require('./../../src/runner/scheduleRunner')(hwi, true);
  });

  after(function() {
    scheduleRunner.stopSchedule(function() {
      scheduleRunner.clear();
      scheduleHandler.clear();
    });
  });

  it('status should be "unavailable" before schedule is loaded', function() {
    var status = scheduleRunner.getStatus();
    expect(status.status).to.equal('unavailable');
  });

  it('startSchedule without loaded schedule should result in an error', function(done) {
    scheduleRunner.startSchedule(function(err, data) {
      expect(err).to.equal('No schedule loaded');
      done();
    });
  });

  it('startSchedule with loaded schedule', function(done) {
    var schedule = JSON.parse(fs.readFileSync('test/runner/scheduleRunner-spec-schedule.json', 'utf8'));
    scheduleHandler.setSchedule(schedule);
    scheduleRunner.startSchedule(function(err, data) {
      expect(err).to.not.exist;
      done();
    });
  });

  it('startSchedule without callback', function() {
    var err = scheduleRunner.startSchedule();
    expect(err).to.not.exist;
  });

  it('stopSchedule with loaded schedule', function(done) {
    scheduleRunner.startSchedule(function(err, data) {
      scheduleRunner.stopSchedule(function(err, data) {
        expect(err).to.not.exist;
        expect(scheduleRunner.getStatus().status).to.equal('stopped');
        done();
      });
    });
  });
});