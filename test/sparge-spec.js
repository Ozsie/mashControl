var chai = require('chai');
var expect = chai.expect; // we are using the "expect" style of Chai
var fs = require('fs');
var sparge = require('./../sparge');
var gpioMock = require('gpio-mock');
var heatControl = require('./../heatControl');

describe('sparge', function() {

  before(function(done) {
    this.timeout(5000);
    gpioMock.start(function(err) {
      if (!err) {
        console.log('GPIO mocked');
        heatControl.turnOn(function(err) {
          if (err) {
            console.log(err);
          }
          gpioMock.addDS18B20('28-800000263717', {
            behavior: 'static',
            temperature: 42
          }, function(err) {
            if (!err) {
              console.log('DS18B20 mocked');
            }
            done();
          });
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
    sparge.spargePause(status, schedule);
    setTimeout(function() {
      expect(status.step).to.equal(2);
      expect(status.stepName).to.equal('Sparge Pause');
      expect(status.startTime).to.not.equal(0);
      expect(status.timeRemaining).to.equal(1200);
      done();
    }, 60);
  });
});