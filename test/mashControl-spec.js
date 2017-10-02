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

  it('GET /apa (unrecognized api call) should return status 404', function(done) {
    var testSchedule = JSON.parse(fs.readFileSync('test/mashControl-spec-schedule.json', 'utf8'));
    chai.request(mashControl.server)
        .get('/apa')
        .end(function(err, res){
          expect(res.status).to.equal(404);
          done();
        });
  });
});