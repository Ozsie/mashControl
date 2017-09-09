var db = require('../db');

module.exports = function (app, winston) {
  app.post('/schedule/store/create', function(req, res) {
    winston.info('Create schedule');
    var schedule = req.body;
    db.createSchedule(schedule, function(err, data) {
      if (!err) {
        res.status(200).send({uuid: data});
      }
    });
  });

  app.get('/schedule/store/retrieve/:uuid', function(req, res) {
    var uuid = req.params.uuid;
    winston.info('Retrieve schedule ' + uuid);
    db.retrieveSchedule(uuid, function(err, data) {
      if (!err) {
        res.status(200).send(data);
      }
    });
  });

  app.get('/schedule/store/retrieve/', function(req, res) {
    winston.info('Retrieve all schedules');
    db.retrieveSchedules(function(err, data) {
      if (!err) {
        res.status(200).send({schedules: data});
      }
    });
  });

  app.put('/schedule/store/update/:uuid', function(req, res) {
    var schedule = req.body;
    var uuid = req.params.uuid;
    winston.info('Update schedule ' + uuid);
    db.updateSchedule(uuid, schedule, function(err, data) {
      if (!err) {
        res.status(200).send(data);
      }
    });
  });

  app.delete('/schedule/store/delete/:uuid', function(req, res) {
    var uuid = req.params.uuid;
    winston.info('Delete schedule ' + uuid);
    db.deleteSchedule(uuid, function(err, data) {
      if (!err) {
        res.status(200).send(data);
      }
    });
  });
};