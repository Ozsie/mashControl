var chai = require('chai');
var chaiHttp = require('chai-http');
var gpioMock = require('gpio-mock');
var expect = chai.expect;
var should = chai.should();
var mashControl = require('./../src/mashControl');
var fs = require('fs');

chai.use(chaiHttp);

describe('mashControl', function() {

  before(function(done) {
    gpioMock.start(function(err) {
      if (!err) {
        console.log('GPIO mocked');
        gpioMock.addDS18B20('28-800000263717', {
          behavior: 'static',
          temperature: 35
        }, function(err) {
          if (!err) {
            console.log('DS18B20 mocked');
          }
          setTimeout(function() {
            console.log('DONE');
            done();
          }, 1800)
        });
      }
    });
  });

  after(function() {
    gpioMock.stop();
    mashControl.server.close();
  });

  it('GET /pump/status should return pump status "false" before pump is started and have http status 200', function(done) {
    chai.request(mashControl.server)
        .get('/pump/status')
        .end(function(err, res){
          expect(res.status).to.equal(200);
          var body = JSON.parse(res.text);
          expect(body).to.equal(false);
          done();
        });
  });

  it('GET /pump/start should start pump and return status "true" and http status 200', function(done) {
    chai.request(mashControl.server)
        .get('/pump/start')
        .end(function(err, res){
          expect(res.status).to.equal(200);
          var body = JSON.parse(res.text);
          expect(body).to.equal(true);
          done();
        });
  });

  it('GET /pump/status should return pump status "true" when pump is started and have http status 200', function(done) {
    chai.request(mashControl.server)
        .get('/pump/status')
        .end(function(err, res){
          expect(res.status).to.equal(200);
          var body = JSON.parse(res.text);
          expect(body).to.equal(true);
          done();
        });
  });

  it('GET /pump/stop should stop pump and return status "false" and http status 200', function(done) {
    chai.request(mashControl.server)
        .get('/pump/stop')
        .end(function(err, res){
          expect(res.status).to.equal(200);
          var body = JSON.parse(res.text);
          expect(body).to.equal(false);
          done();
        });
  });

  it('GET /pump/status should return pump status "false" when pump is stopped and have http status 200', function(done) {
    chai.request(mashControl.server)
        .get('/pump/status')
        .end(function(err, res){
          expect(res.status).to.equal(200);
          var body = JSON.parse(res.text);
          expect(body).to.equal(false);
          done();
        });
  });
});