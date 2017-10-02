var chai = require('chai');
var chaiHttp = require('chai-http');
var gpioMock = require('gpio-mock');
var expect = chai.expect;
var should = chai.should();
var mashControl = require('./../src/mashControl');
var fs = require('fs');

chai.use(chaiHttp);

describe('mashControl', function() {

  before(function() {
  });

  after(function() {
    mashControl.server.close();
  });

  var uuid = '';
  var loaded = {};

  it('POST /schedule/store/create should return an uuid and have status 200', function(done) {
    var testSchedule = JSON.parse(fs.readFileSync('test/mashControl-spec-schedule.json', 'utf8'));
    this.timeout(2500);
    chai.request(mashControl.server)
        .post('/schedule/store/create')
        .send(testSchedule)
        .end(function(err, res){
          expect(res.status).to.equal(200);
          expect(res.text).to.exist;
          uuid = JSON.parse(res.text).uuid;
          expect(uuid).to.exist;
          console.log(uuid);
          done();
        });
  });

  it('GET /schedule/store/retrieve/:uuid should return a stored schedule and have status 200', function(done) {
    var testSchedule = JSON.parse(fs.readFileSync('test/mashControl-spec-schedule.json', 'utf8'));
    chai.request(mashControl.server)
        .get('/schedule/store/retrieve/' + uuid)
        .end(function(err, res){
          loaded = JSON.parse(res.text);
          expect(res.status).to.equal(200);
          expect(loaded.uuid).to.equal(uuid);
          expect(loaded.steps.length).to.equal(testSchedule.steps.length);
          expect(loaded.spargePause).to.equal(testSchedule.spargePause);
          done();
        });
  });

  it('GET /schedule/store/retrieve should return all stored schedules and have status 200', function(done) {
    var testSchedule = JSON.parse(fs.readFileSync('test/mashControl-spec-schedule.json', 'utf8'));
    chai.request(mashControl.server)
        .get('/schedule/store/retrieve')
        .end(function(err, res){
          var all = JSON.parse(res.text);
          expect(res.status).to.equal(200);
          expect(all.schedules).to.exist;
          expect(all.schedules[uuid]).to.exist;
          done();
        });
  });

  it('PUT /schedule/store/update should return an uuid and have status 200', function(done) {
    var testSchedule = JSON.parse(fs.readFileSync('test/mashControl-spec-schedule.json', 'utf8'));
    testSchedule.boilTime = 15;
    this.timeout(2500);
    chai.request(mashControl.server)
        .put('/schedule/store/update/' + uuid)
        .send(testSchedule)
        .end(function(err, res) {
          expect(res.status).to.equal(200);
          expect(res.text).to.exist;
          expect(res.text).to.exist;
          expect(res.text).to.equal(uuid);
          done();
        });
  });

  it('DELETE /schedule/store/delete/:uuid should return uuid and have status 200', function(done) {
    chai.request(mashControl.server)
        .delete('/schedule/store/delete/' + uuid)
        .end(function(err, res){
          expect(res.status).to.equal(200);
          expect(res.text).to.exist;
          expect(res.text).to.equal(uuid);
          done();
        });
  });
});