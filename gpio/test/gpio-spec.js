var chai = require('chai');
var expect = chai.expect; // we are using the "expect" style of Chai
var gpio = require('./../gpio');
var fs = require('fs');

describe('GPIO', function() {
  afterEach(function() {
    gpio.settings.path = "/sys/class/gpio/";

    if (fs.existsSync("./gpio/gpio1/")) {
      if (fs.existsSync("./gpio/gpio1/direction")) {
        fs.unlinkSync("./gpio/gpio1/direction");
      }
      fs.rmdirSync("./gpio/gpio1");
    }
    if (fs.existsSync("./gpio/")) {
      if (fs.existsSync("./gpio/export")) {
        fs.unlinkSync("./gpio/export");
      }
      if (fs.existsSync("./gpio/unexport")) {
        fs.unlinkSync("./gpio/unexport");
      }
      fs.rmdirSync("./gpio/");
    }
  });

  it('openPin should return error when export file is not available', function(done) {
    gpio.openPin(0, "out", function(err, data) {
      expect(err.gpioMessage).to.equal("Error opening pin 0");
      expect(data).to.be.undefined;
      done();
    });
  });

  it('openPin should return error when gpio file is not available', function(done) {
    gpio.settings.path = "./gpio/";
    fs.mkdir(gpio.settings.path);
    fs.writeFile(gpio.settings.path + "export", "0");
    gpio.openPin(1, "out", function(err, data) {
      expect(err.gpioMessage).to.equal("Could not set direction to out for pin 1");
      expect(data).to.be.undefined;
      done();
    });
  });

  it('openPin should return ok when all files are available', function(done) {
    gpio.settings.path = "./gpio/";
    fs.mkdirSync(gpio.settings.path);
    fs.writeFileSync(gpio.settings.path + "export", "0");
    fs.mkdirSync(gpio.settings.path + "gpio1");
    fs.writeFile(gpio.settings.path + "gpio1/direction", "in");
    gpio.openPin(1, "out", function(err, data) {
      expect(err).to.be.undefined;
      expect(data).to.equal("open");
      done();
    });
  });

  it('openPin should throw error when no callback is provided', function() {
    expect(gpio.openPin.bind(0, "out")).to.throw("Callback function required");
  });

  it('closePin should return error when gpio file is not available', function(done) {
    gpio.closePin(0, function(err) {
      expect(err).to.exist;
      expect(err.syscall).to.equal('open');
      expect(err.path).to.equal('/sys/class/gpio/unexport');
      done();
    });
  });

  it('closePin should throw error when no callback is provided', function() {
    expect(gpio.closePin.bind(0)).to.throw("Callback function required");
  });
});