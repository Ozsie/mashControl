var chai = require('chai');
var expect = chai.expect; // we are using the "expect" style of Chai
var fs = require('fs');
var mash = require('./../runner/mash');
var gpioMock = require('gpio-mock');
var heatControl = require('./../components/heatControl');

describe('mash', function() {

  before(function(done) {
    this.timeout(5000);
    gpioMock.start(function(err) {
      if (!err) {
        console.log('GPIO mocked');

        gpioMock.addDS18B20('28-800000263717', {
          behavior: 'static',
          temperature: 42
        }, function(err) {
          if (!err) {
            console.log('DS18B20 mocked');
          }
          done();
        });
      }
    })
  });

  after(function() {
    gpioMock.stop();
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
      done();
    }, 60);
  });

  it('temperature should be adjusted if enough time has passed', function(done) {
    var status = {step: 0, stepName: "", initialTemp: 0, startTime: Date.now(), timeRemaining: 0};
    var schedule = JSON.parse(fs.readFileSync('test/mashControl-spec-schedule.json', 'utf8'));
    schedule.startTime = Date.now() - 120000;
    mash.adjustTemperature(schedule.steps[0], schedule.volume, status, schedule);
    setTimeout(function() {
      expect(status.initialTemp).to.equal(0);
      expect(status.temperature).to.equal(42);
      expect(status.minutes).to.equal(2);
      done();
    }, 60);

  });

  it('temperature adjustment should stop if temp 90 ', function(done) {
    this.timeout(8000);
    gpioMock.setDS18B20('28-800000263717', {
      behavior: 'static',
      temperature: 91
    }, function(err) {
      if (!err) {
        console.log('mash');
        var status = {step: 0, stepName: "", initialTemp: 0, startTime: Date.now(), timeRemaining: 0};
        var schedule = JSON.parse(fs.readFileSync('test/mashControl-spec-schedule.json', 'utf8'));
        schedule.startTime = Date.now() - 120000;
        mash.adjustTemperature(schedule.steps[0], schedule.volume, status, schedule);
        setTimeout(function() {
          expect(status.initialTemp).to.equal(0);
          expect(status.temperature).to.not.exist;
          expect(status.status).to.equal('stopped');
          expect(schedule.status).to.equal('stopped');
          done();
        }, 3900);
      }
    });
  });
});