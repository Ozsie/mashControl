var http = require('http');
var express = require('express');
var fs = require('fs');
var exec = require('child_process').exec;
var bodyParser = require('body-parser');

var schedule;
//"/sys/bus/w1/devices/28-800000263717/w1_slave"
var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));

var adjustTemperature = function(targetTemp) {
    readTemp(function(error, data) {
      if (!error) {
        currentTemp = parseTemp(data);
        if (currentTemp.temperature.celcius < targetTemp) {
            console.log(currentTemp.temperature.celcius + " < " + targetTemp + " increasing heat.");
        } else if (currentTemp.temperature.celcius > targetTemp) {
            console.log(currentTemp.temperature.celcius + " > " + targetTemp + " decreasing heat.");
        } else {
            console.log(currentTemp.temperature.celcius + " = " + targetTemp + " holding.");
        }
      }
    })
}

var runSchedule = function(callback) {
  console.log("Schedule: " + JSON.stringify(schedule));
  var i = 0;

  var nextStep = function(index) {
    console.log("Index: " + index);
    var step = schedule.steps[index];
    step.startTime = Date.now();
    console.log("Starting step " + (index + 1) + ", " + step.name + " at " + step.startTime);
    var stepTime = (step.riseTime + step.time) * 60 * 1000;
    console.log("Will run for " + stepTime + " ms");

    var run = function() {
      setTimeout(function() {
        if (Date.now() - step.startTime < stepTime) {
          console.log("Time left: " + (stepTime - (Date.now() - step.startTime)));
          adjustTemperature(step.temperature);
          run();
        }
      }, 1000);
    };

    run();
    return stepTime;
  };

  var nexInMs = nextStep(i);
  var doStep = function() {
    console.log("Next step in " + nexInMs + " ms");
    setTimeout(function() {
      i++;
      if (i < schedule.steps.length) {
        console.log("It's time for the next step");
        nexInMs = nextStep(i);
        doStep();
      } else {
        callback();
      }
    }, nexInMs);
  };
  doStep();
};

var startSchedule = function(newSchedule) {
  if (newSchedule) {
    console.log(JSON.stringify(schedule));
    schedule = newSchedule;
    schedule.startTime = Date.now();
    schedule.status = 'running';
    runSchedule(function() {
      schedule.endTime = Date.now();
      console.log("Mash done after " + (schedule.endTime - schedule.startTime) + " ms");
      schedule.status = 'done';
    });
    return true;
  } else {
    return false;
  }
};

var stopSchedule = function() {
  if (schedule) {
    console.log(schedule);
    schedule.status = 'stopped';
    return true;
  } else {
    return false;
  }
};

var getStatus = function() {
  if (!schedule) {
    return "unavailable";
  } else {
    return schedule.status;
  }
};

var modprobe = function(error, stdout, stderr) {
 if (error) {
   console.log("MODPROB ERROR:  " + error);
   console.log("MODPROB STDERR: " + stderr);
 }
};

var readTemp = function() {
  readTemp(function(err, data) {
    console.log("data:" + data);
  });
};

var readTemp = function(callback) {
  fs.readFile(settings.input, 'utf8', callback);
};

var parseTemp = function(data) {
  var crc = data.match(/(crc=)[a-z0-9]*/g)[0];
  crc = crc.split("=")[1];
  var available = data.match(/([A-Z])\w+/g)[0];
  var temperature = 'n/a';
  if (available === 'YES') {
    temperature = data.match(/(t=)[0-9]{5}/g)[0];
    temperature = temperature.split("=")[1];
    temperature = parseInt(temperature);
  }
  var temp = {
    crc: crc,
    available: available,
    temperature: {
      raw: temperature,
      celcius: temperature / 1000
    },
    time: Date.now()
  };
  //console.log("Temp status: " + temp);

  return temp;
};

if (settings.installKernelMod) {
    exec("modprobe w1-gpio", modprobe);
    exec("modprobe w1-therm", modprobe);
}

var app = express();

app.use(express['static']('app'));
app.use(bodyParser.json());

// Express route for incoming requests for a customer name
app.get('/temp/current', function(req, res) {
  //console.log('Temp requested');
  readTemp(function(error, data) {
    if (!error) {
      res.status(200).send(parseTemp(data));
    }
  });
});

app.post('/schedule/start', function(req, res) {
  console.log('Start schedule requested ' + JSON.stringify(req.body));
  var scheduleStarted = startSchedule(req.body);
  console.log('Start ok = ' + scheduleStarted);
  res.status(200).send(scheduleStarted);
});

app.get('/schedule/stop', function(req, res) {
  console.log('Stop schedule requested');
  var scheduleStopped = stopSchedule();
  res.status(200).send(scheduleStopped);
});

app.get('/schedule/status', function(req, res) {
  console.log('Schedule status requested');
  var status = getStatus();
  res.status(200).send(status);
});

app.get('/schedule', function(req, res) {
  console.log('Get Schedule');
  res.status(200).send(schedule);
});

// Express route for any other unrecognised incoming requests
app.get('*', function(req, res) {
  res.status(404).send('Unrecognised API call');
});

// Express route to handle errors
app.use(function(err, req, res, next) {
  if (req.xhr) {
    res.status(500).send('Oops, Something went wrong!');
  } else {
    next(err);
  }
});

app.listen(3000);
console.log('App Server running at port 3000');
console.log('Current temp: ' + readTemp());
