var chai = require('chai');
var expect = chai.expect; // we are using the "expect" style of Chai
var tempSensor = require('./../tempSensor');

describe('TempSensor', function() {
  it('readTemp should return error when temperature file is not available', function(done) {
    tempSensor.readTemp(function(err, data) {
      expect(data).to.not.exist;
      expect(err).to.exist;
      console.log(err);
      done();
    });
  });

  it('readTemp should return data when temperature file is available', function(done) {
      tempSensor.settings.input = "./testTemp.txt";
      tempSensor.readTemp(function(err, data) {
        expect(data).to.exist;
        expect(data).to.equal('00 11 22 33 44 55 aa bb cc dd : crc=66 YES\n77 88 99 ee ff 00 11 22 33 44 t=35000');
        expect(err).to.not.exist;
        done();
      });
    });
});