var chai = require('chai');
var expect = chai.expect; // we are using the "expect" style of Chai
var fs = require('fs');
var boil = require('./../boil');

describe('boil', function() {
  beforeEach(function() {
    boil.tempSensor.settings.input = "node_modules/mc-tempsensor/test/testTemp.txt";
    boil.heatControl.gpio.settings.path = "./gpio-mock/";

    var mockGpio = function(pin) {
      fs.writeFileSync(boil.heatControl.gpio.settings.path + "export", pin);
      fs.mkdirSync(boil.heatControl.gpio.settings.path + "gpio" + pin);
      fs.writeFile(boil.heatControl.gpio.settings.path + "gpio" + pin + "/direction", "in");
    }

    fs.mkdirSync(boil.heatControl.gpio.settings.path);
    mockGpio("18");
    mockGpio("4");
    mockGpio("17");
    mockGpio("23");
    mockGpio("24");
  });

  afterEach(function() {
    boil.tempSensor.settings.input = "/sys/bus/w1/devices/28-800000263717/w1_slave";
    boil.heatControl.gpio.settings.path = "/sys/class/gpio/";

    var clearGpioMock = function(pin) {
      if (fs.existsSync("./gpio-mock/gpio" + pin + "/")) {
        if (fs.existsSync("./gpio-mock/gpio" + pin + "/direction")) {
          fs.unlinkSync("./gpio-mock/gpio" + pin + "/direction");
        }
        if (fs.existsSync("./gpio-mock/gpio" + pin + "/value")) {
          fs.unlinkSync("./gpio-mock/gpio" + pin + "/value");
        }
        fs.rmdirSync("./gpio-mock/gpio" + pin);
      }
    }

    clearGpioMock("18");
    clearGpioMock("4");
    clearGpioMock("17");
    clearGpioMock("23");
    clearGpioMock("24");

    if (fs.existsSync("./gpio-mock/")) {
      if (fs.existsSync("./gpio-mock/export")) {
        fs.unlinkSync("./gpio-mock/export");
      }
      if (fs.existsSync("./gpio-mock/unexport")) {
        fs.unlinkSync("./gpio-mock/unexport");
      }
      fs.rmdirSync("./gpio-mock/");
    }
  });

  it('status should be updated correctly', function(done) {
    var status = {step: 0, stepName: "", initialTemp: 0, startTime: 0, timeRemaining: 0};
    var schedule = JSON.parse(fs.readFileSync('test/mashControl-spec-schedule.json', 'utf8'));
    boil.boil(status, schedule);
    setTimeout(function() {
      expect(status.step).to.equal(2);
      expect(status.stepName).to.equal('Boil');
      expect(status.startTime).to.not.equal(0);
      expect(status.timeRemaining).to.equal(4200000);
      done();
    }, 60);
  });

  it('temperature should be adjusted if enough time has passed', function(done) {
    var status = {step: 0, stepName: "", initialTemp: 0, startTime: Date.now(), timeRemaining: 0};
    var schedule = JSON.parse(fs.readFileSync('test/mashControl-spec-schedule.json', 'utf8'));
    schedule.startTime = Date.now() - 120000;
    boil.adjustTemperatureForBoil(status, schedule);
    setTimeout(function() {
      console.log(status);
      expect(status.initialTemp).to.equal(0);
      expect(status.temperature).to.equal(35);
      expect(status.minutes).to.equal(2);
      done();
    }, 60);

  });
});