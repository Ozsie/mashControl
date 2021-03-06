var chai = require('chai');
var chaiHttp = require('chai-http');
var gpioMock = require('gpio-mock');
var expect = chai.expect;
var should = chai.should();
var mashControl;
var fs = require('fs');

chai.use(chaiHttp);

describe('scheduleRoutes', function() {
  before(function(done) {
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
          mashControl = require('./../src/mashControl');
          done();
        });
      } else {
        done();
      }
    })
  });

  after(function(done) {
    console.log('AFTER')
    mashControl.closeServer(function() {
      console.log('SERVER CLOSED');
      gpioMock.stop();
      done();
    });
  });

  it('POST /schedule/start should return "true" and have status 200', function(done) {
    var testSchedule = JSON.parse(fs.readFileSync('test/mashControl-spec-schedule.json', 'utf8'));
    this.timeout(2500);
    var start = Date.now();
    chai.request(mashControl.server)
        .post('/schedule/start')
        .send(testSchedule)
        .end(function(err, res){
          var end = Date.now();
          console.log('Time: ' + (end - start));
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
          expect(JSON.parse(res.text).status).to.equal("running");
          done();
        });
  });

  it('GET /schedule/stop should return "true" and have status 200', function(done) {
    chai.request(mashControl.server)
        .get('/schedule/stop')
        .end(function(err, res){
          console.log('--------------------------------- STOPPED');
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
          expect(JSON.parse(res.text).status).to.equal("stopped");
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

  it('GET /schedule/tempLog should return the temp log and have status 200', function(done) {
    var testSchedule = JSON.parse(fs.readFileSync('test/mashControl-spec-schedule.json', 'utf8'));
    chai.request(mashControl.server)
        .get('/schedule/tempLog')
        .end(function(err, res){
          expect(res.status).to.equal(200);
          var body = JSON.parse(res.text);
          expect(body.log).to.exist;
          expect(body.log.length).to.equal(0);
          done();
        });
  });
});