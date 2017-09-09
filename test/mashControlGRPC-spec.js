/*
var chai = require('chai');
var expect = chai.expect;
var grpc = require('grpc');
var gpioMock = require('gpio-mock');
var mashControl = require('./../src/mashControl');
var fs = require('fs');
var mcProto = grpc.load('../mashControl.proto').mashControl;

describe('mashControlGRPC', function() {
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

  it('GetScheduleStatus should return "stopped"', function(done) {
    var mcProto = grpc.load('./mashControl.proto').mashControl;
    var client = new mcProto.ScheduleService('localhost:50051', grpc.credentials.createInsecure());

    client.getScheduleStatus({}, function(err, response) {
      expect(response.status).to.equal("stopped");
      expect(err).to.not.exist;
      done();
    });
  });
});
*/