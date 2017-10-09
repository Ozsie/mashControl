var chai = require('chai');
var expect = chai.expect; // we are using the "expect" style of Chai
var fs = require('fs');
var util = require('./../src/util');

describe('util', function() {
  it('cut off point should be calculated', function() {
    var targetTemp = 40;
    var initialTemp = 15;
    var volume = 1;
    var cutOffPoint = util.calculateCutOffPoint(targetTemp, initialTemp, volume);

    expect(cutOffPoint).to.equal(33);
  });

});