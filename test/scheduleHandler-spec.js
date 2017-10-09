var chai = require('chai');
var expect = chai.expect; // we are using the "expect" style of Chai
var fs = require('fs');
var scheduleHandler = require('./../src/scheduleHandler');

describe('scheduleHandler', function() {
  it('getTempLog should return an empty array if no schedule is loaded', function() {
    scheduleHandler.clear();
    var tempLog = scheduleHandler.getTempLog();
    expect(tempLog.length).to.equal(0);
  });

  it('calling getRunningForMinutes one minute after schedule.startTime should return 1', function(done) {
    this.timeout(65000);
    var schedule = JSON.parse(fs.readFileSync('test/mashControl-spec-schedule.json', 'utf8'));
    schedule.startTime = Date.now();
    scheduleHandler.setSchedule(schedule);
    setTimeout(function() {
      var runTime = scheduleHandler.getRunningForMinutes(schedule);
      expect(runTime).to.equal(1);
      done();
    }, 60000);
  });


  it('calculateStepTime should correctly calculate total step tim in ms', function() {
    var schedule = JSON.parse(fs.readFileSync('test/mashControl-spec-schedule.json', 'utf8'));
    schedule.steps[0].riseTime = 1;
    var stepTime = scheduleHandler.calculateStepTime(schedule.steps[0]);
    expect(stepTime).to.equal(66000);
  });
});