var chai = require('chai');
var expect = chai.expect; // we are using the "expect" style of Chai
var fs = require('fs');
var db = require('./../src/db');

describe('db', function() {
  before(function() {
    db.clearSchedules(function() {
      console.log('Schedules cleared');
    });
  });

  var uuid;

  it('default schedule should not be retrieved before loading schedules', function(done) {
    db.retrieveSchedule('default', function(err, data) {
      expect(data).to.be.undefined;
      done();
    });
  });

  it('schedule should be stored', function(done) {
    var schedule = JSON.parse(fs.readFileSync('test/mashControl-spec-schedule.json', 'utf8'));
    db.createSchedule(schedule, function(err, data) {
      expect(data).to.not.be.null;
      uuid = data;
      schedule.uuid = uuid;
      var storedSchedule = JSON.parse(fs.readFileSync('schedules/' + uuid + '.json', 'utf8'));
      expect(storedSchedule).to.deep.equal(schedule);
      done();
    });
  });

  it('schedule should be retrieved', function(done) {
    db.retrieveSchedule(uuid, function(err, data) {
      expect(data).to.not.be.null;
      expect(data.uuid).to.equal(uuid);
      done();
    });
  });

  it('default schedule should be retrieved after loading schedules', function(done) {
    var defaultSchedule = JSON.parse(fs.readFileSync('schedules/default.json', 'utf8'));
    db.loadSchedules(function(err, data) {
      if (!err) {
        db.retrieveSchedule('default', function(err, data) {
          expect(data).to.deep.equal(defaultSchedule);
          done();
        });
      }
    })
  });

  it('schedule should be updated', function(done) {
    var oldSchedule = JSON.parse(fs.readFileSync('schedules/' + uuid + '.json', 'utf8'));
    var modifiedSchedule = JSON.parse(fs.readFileSync('schedules/' + uuid + '.json', 'utf8'));
    modifiedSchedule.boilTime = 90;
    modifiedSchedule.name = "Test";
    db.updateSchedule(uuid, modifiedSchedule, function(err, data) {
      expect(data).to.not.be.null;
      expect(data).to.equal(uuid);
      var storedSchedule = JSON.parse(fs.readFileSync('schedules/' + uuid + '.json', 'utf8'));
      expect(storedSchedule).to.deep.equal(modifiedSchedule);
      expect(storedSchedule).to.not.equal(oldSchedule);
      done();
    });
  });

  it('schedule should be removed', function(done) {
    var storedSchedule = JSON.parse(fs.readFileSync('schedules/' + uuid + '.json', 'utf8'));
    db.deleteSchedule(uuid, function(err, data) {
      expect(data).to.not.be.null;
      expect(data).to.equal(uuid);
      console.log("-------------" + uuid);
      var checkFile = function() {
        fs.accessSync('schedules/' + uuid + '.json')
      };
      expect(checkFile).to.throw(Error);
      done();
    });
  });

});