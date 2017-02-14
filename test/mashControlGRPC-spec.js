var chai = require('chai');
var expect = chai.expect;
var grpc = require('grpc');
var mashControl = require('./../mashControl');
var fs = require('fs');
var mcProto = grpc.load('./mashControl.proto').mashControl;

describe('mashControlGRPC', function() {
  beforeEach(function() {
    mashControl.tempSensor.settings.input = "node_modules/mc-tempsensor/test/testTemp.txt";
    mashControl.heatControl.gpio.settings.path = "./gpio-mock/";

    var mockGpio = function(pin) {
      fs.writeFileSync(mashControl.heatControl.gpio.settings.path + "export", pin);
      fs.mkdirSync(mashControl.heatControl.gpio.settings.path + "gpio" + pin);
      fs.writeFile(mashControl.heatControl.gpio.settings.path + "gpio" + pin + "/direction", "in");
    }

    fs.mkdirSync(mashControl.heatControl.gpio.settings.path);
    mockGpio("18");
    mockGpio("4");
    mockGpio("17");
    mockGpio("23");
    mockGpio("24");
  });

  afterEach(function() {
    mashControl.tempSensor.settings.input = "/sys/bus/w1/devices/28-800000263717/w1_slave";
    mashControl.heatControl.gpio.settings.path = "/sys/class/gpio/";

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

  it('GetTemperature should return a parsed temperature', function(done) {
    var mcProto = grpc.load('./mashControl.proto').mashControl;
    var client = new mcProto.TemperatureService('localhost:50051', grpc.credentials.createInsecure());

    client.getTemperature({}, function(err, response) {
      expect(response.temperature.raw).to.equal(35000);
      expect(response.temperature.celcius).to.equal(35);
      expect(response.crc).to.equal('66');
      expect(response.available).to.equal('YES');
      expect(response.time).to.exist;
      expect(parseInt(response.time)).to.be.above(0);
      done();
    });
  });

  it('GetRawTemperature should return a raw temperature string', function(done) {
    var mcProto = grpc.load('./mashControl.proto').mashControl;
    var client = new mcProto.TemperatureService('localhost:50051', grpc.credentials.createInsecure());

    client.getRawTemperature({}, function(err, response) {
      expect(response.temperature).to.equal('00 11 22 33 44 55 aa bb cc dd : crc=66 YES\n77 88 99 ee ff 00 11 22 33 44 t=35000');
      expect(err).to.not.exist;
      done();
    });
  });

  it('GetRawTemperature should return a raw temperature string', function(done) {
    var mcProto = grpc.load('./mashControl.proto').mashControl;
    var client = new mcProto.ScheduleService('localhost:50051', grpc.credentials.createInsecure());

    client.getScheduleStatus({}, function(err, response) {
      expect(response.status).to.equal("stopped");
      expect(err).to.not.exist;
      done();
    });
  });
});