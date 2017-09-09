var chai = require('chai');
var expect = chai.expect; // we are using the "expect" style of Chai
var fs = require('fs');
var scheduleRunner = require('./../src/runner/scheduleRunner');

describe('scheduleRunner', function() {

  it('cut off point should be calculated', function() {
    var cutOffPoint = scheduleRunner.calculateCutOffPoint(40, 15, 1);

    console.log(cutOffPoint);

    cutOffPoint = scheduleRunner.calculateCutOffPoint(60, 44, 1);

    console.log(cutOffPoint);

    cutOffPoint = scheduleRunner.calculateCutOffPoint(78, 68, 1);

    console.log(cutOffPoint);
  });
});