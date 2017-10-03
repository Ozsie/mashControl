var chai = require('chai');
var expect = chai.expect; // we are using the "expect" style of Chai
var fs = require('fs');
var util = require('./../src/util');

describe('scheduleRunner', function() {
  it('cut off point should be calculated', function() {
    var targetTemp = 40;
    var initialTemp = 15;
    var volume = 1;
    var cutOffPoint = util.calculateCutOffPoint(targetTemp, initialTemp, volume);

    expect(cutOffPoint).to.equal(33);
  });

  it('calling getRunningForMinutes one minute after schedule.startTime should return 1', function(done) {
    this.timeout(65000);
    var schedule = JSON.parse(fs.readFileSync('test/mashControl-spec-schedule.json', 'utf8'));
    schedule.startTime = Date.now();
    setTimeout(function() {
      var runTime = util.getRunningForMinutes(schedule);
      expect(runTime).to.equal(1);
      done();
    }, 60000);
  });

  it('', function() {
    var schedule = JSON.parse(fs.readFileSync('test/mashControl-spec-schedule.json', 'utf8'));
    schedule.steps[0].riseTime = 1;
    var stepTime = util.calculateStepTime(schedule.steps[0]);
    expect(stepTime).to.equal(66000);
  });

});