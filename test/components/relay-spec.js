var chai = require('chai');
var expect = chai.expect; // we are using the "expect" style of Chai
var fs = require('fs');

describe('relay', function() {
  var relay;

  before(function() {
    var gpio = {
      openPinOut: function(pin, callback) { callback(); },
      closePin: function(pin, callback) { callback(); },
      write: function(pin, x, callback) { callback(); },
      writeSync: function(pin, x) {}
    };
    relay = require('../../src/components/relay')(gpio);
  });

  it('getRelayStatus should return correct mapping and indicate that all relays are closed before anything else is called', function() {
    var status = relay.getRelayStatus();
    expect(status.length).to.equal(4);

    for (var i = 0; i < status.length; i++) {
      expect(status[i].index).to.equal(i);
      expect(status[i].open).to.equal(false);
    }

    expect(status[0].pin).to.equal(27);
    expect(status[0].name).to.equal('Circulation pump');
    expect(status[1].pin).to.equal(19);
    expect(status[1].name).to.equal('Heater on');
    expect(status[2].pin).to.equal(13);
    expect(status[2].name).to.equal('Heater mode');
    expect(status[3].pin).to.equal(26);
    expect(status[3].name).to.equal('Chiller valve');
  });

  it('Opening relay 0 should change open to true', function(done) {
    relay.setRelay({state: 'on', index: 0}, function(err, data) {
      expect(err).to.not.exist;
      expect(data.index).to.equal(0);
      expect(data.open).to.equal(true);
      done();
    });
  });

  it('Opening relay 0 when already open should cause no errors', function(done) {
    relay.setRelay({state: 'on', index: 0}, function(err, data) {
      expect(err).to.not.exist;
      expect(data.index).to.equal(0);
      expect(data.open).to.equal(true);
      done();
    });
  });

  it('Closing relay 0 when open should cause no errors', function(done) {
    relay.setRelay({state: 'off', index: 0}, function(err, data) {
      expect(err).to.not.exist;
      expect(data.index).to.equal(0);
      expect(data.open).to.equal(false);
      done();
    });
  });

  it('Closing relay 0 when already closed should cause no errors', function(done) {
    relay.setRelay({state: 'off', index: 0}, function(err, data) {
      expect(err).to.not.exist;
      expect(data.index).to.equal(0);
      expect(data.open).to.equal(false);
      done();
    });
  });
});