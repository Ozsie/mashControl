var chai = require('chai');
var chaiHttp = require('chai-http');
var expect = chai.expect;
var should = chai.should();
var mashControl = require('./../mashControl');
var fs = require('fs');

chai.use(chaiHttp);

describe('mashControl', function() {
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

  it('GET /temp/current should return current temperature and have status 200', function(done) {
    chai.request(mashControl.server)
        .get('/temp/current')
        .end(function(err, res){
          expect(res.status).to.equal(200);
          var body = JSON.parse(res.text);
          expect(body.temperature.raw).to.equal(35000);
          expect(body.temperature.celcius).to.equal(35);
          expect(body.crc).to.equal('66');
          expect(body.available).to.equal('YES');
          expect(body.time).to.exist;
          expect(body.time).to.be.above(0);
          done();
        });
  });

  it('POST /schedule/start should return "true" and have status 200', function(done) {
    var testSchedule = JSON.parse(fs.readFileSync('test/mashControl-spec-schedule.json', 'utf8'));
    chai.request(mashControl.server)
        .post('/schedule/start')
        .send(testSchedule)
        .end(function(err, res){
          expect(res.status).to.equal(200);
          expect(res.text).to.equal("true");
          done();
        });
  });

  it('GET /schedule/status should return "running" and have status 200', function(done) {
    chai.request(mashControl.server)
        .get('/schedule/status')
        .end(function(err, res){
          expect(res.status).to.equal(200);
          expect(res.text).to.equal("running");
          done();
        });
  });

  it('GET /schedule/stop should return "true" and have status 200', function(done) {
    chai.request(mashControl.server)
        .get('/schedule/stop')
        .end(function(err, res){
          expect(res.status).to.equal(200);
          expect(res.text).to.equal("true");
          done();
        });
  });

  it('GET /schedule/status should return status and have status 200', function(done) {
    chai.request(mashControl.server)
        .get('/schedule/status')
        .end(function(err, res){
          expect(res.status).to.equal(200);
          expect(res.text).to.equal("stopped");
          done();
        });
  });

  it('GET /schedule should return the schedule and have status 200', function(done) {
    var testSchedule = JSON.parse(fs.readFileSync('test/mashControl-spec-schedule.json', 'utf8'));
    chai.request(mashControl.server)
        .get('/schedule')
        .end(function(err, res){
          expect(res.status).to.equal(200);
          var body = JSON.parse(res.text);
          expect(body.startTime).to.exist;
          expect(body.status).to.equal("stopped");
          for (var i = 0; i < body.steps.length; i++) {
            expect(body.steps[i].name).to.equal(testSchedule.steps[i].name);
            expect(body.steps[i].riseTime).to.equal(testSchedule.steps[i].riseTime);
            expect(body.steps[i].temperature).to.equal(testSchedule.steps[i].temperature);
            expect(body.steps[i].time).to.equal(testSchedule.steps[i].time);
            expect(body.steps[i].type).to.equal(testSchedule.steps[i].type);
            expect(body.steps[i].startTime).to.exist;
          }
          done();
        });
  });
});