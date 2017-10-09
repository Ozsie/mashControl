var chai = require('chai');
var chaiHttp = require('chai-http');
var gpioMock = require('gpio-mock');
var expect = chai.expect;
var should = chai.should();
var fs = require('fs');

chai.use(chaiHttp);

var mashControl;

describe('mashControl', function() {
  before(function() {
    hwi = {
      temperature: 42,
      cycleHeaterPower: function() {},
      maxEffect: function() {},
      turnOff: function(callback) { callback(); }
    };
    mashControl = require('./../src/mashControl')(hwi);
  });

  after(function(done) {
    mashControl.closeServer(function() {
      done();
    });
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