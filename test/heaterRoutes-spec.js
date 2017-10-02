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

  it('GET /heater/direction should return undefined when nothing is running', function(done) {
    chai.request(mashControl.server)
        .get('/heater/direction')
        .end(function(err, res){
          var parsed = JSON.parse(res.text);
          expect(res.status).to.equal(200);
          expect(res.direction).to.be.undefined;
          done();
        });
  });
});