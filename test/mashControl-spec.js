var chai = require('chai');
var chaiHttp = require('chai-http');
var expect = chai.expect; // we are using the "expect" style of Chai
var mashControl = require('./../mashControl');
var fs = require('fs');

chai.use(chaiHttp);

describe('scheduleRunner', function() {
  beforeEach(function() {
    mashControl.settings.input = "tempSensor/test/testTemp.txt";
    mashControl.settings.gpio.path = "./gpio-mock/";

    var mockGpio = function(pin) {
      fs.writeFileSync(mashControl.settings.gpio.path + "export", pin);
      fs.mkdirSync(mashControl.settings.gpio.path + "gpio" + pin);
      fs.writeFile(mashControl.settings.gpio.path + "gpio" + pin + "/direction", "in");
    }

    fs.mkdirSync(mashControl.settings.gpio.path);
    mockGpio("18");
    mockGpio("4");
    mockGpio("17");
    mockGpio("23");
    mockGpio("24");
  });

  afterEach(function() {
    mashControl.settings.input = "/sys/bus/w1/devices/28-800000263717/w1_slave";
    mashControl.settings.gpio.path = "/sys/class/gpio/";

    var clearGpioMock = function(pin) {
      if (fs.existsSync("./gpio-mock/gpio" + pin + "/")) {
        if (fs.existsSync("./gpio-mock/gpio" + pin + "/direction")) {
          fs.unlinkSync("./gpio-mock/gpio" + pin + "/direction");
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

  it('should list ALL blobs on /blobs GET', function(done) {
    mashControl.settings.input = "tempSensor/test/testTemp.txt";
    try {
      chai.request(mashControl)
          .get('/temp/current')
          .end(function(err, res){
            res.should.have.status(200);
            done();
          });
    } catch (err) {
      console.log(err);
    }
  });
});