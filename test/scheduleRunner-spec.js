var chai = require('chai');
var expect = chai.expect; // we are using the "expect" style of Chai
var fs = require('fs');
var scheduleRunner = require('./../src/runner/scheduleRunner');

describe('scheduleRunner', function() {

  it('getTempLog should return an empty array if no schedule is loaded', function() {
    scheduleRunner.clear();
    var tempLog = scheduleRunner.getTempLog();
    expect(tempLog.length).to.equal(0);
  });
});