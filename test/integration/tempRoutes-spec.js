var chai = require('chai');
var chaiHttp = require('chai-http');
var gpioMock = require('gpio-mock');
var expect = chai.expect;
var should = chai.should();
var mashControl = require('./../src/mashControl');
var fs = require('fs');

chai.use(chaiHttp);

describe('tempRoutes', function() {
  /*
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
          done();
        });
      } else {
        done();
      }
    });
  });

  after(function(done) {
    gpioMock.stop();
    mashControl.closeServer(function() {
      done();
    });
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

  it('GET /temp/current should return error 503 when hardware is unavailable', function(done) {
    gpioMock.stop();
    chai.request(mashControl.server)
        .get('/temp/current')
        .end(function(err, res){
          expect(res.status).to.equal(503);
          done();
        });
  });
  */
});