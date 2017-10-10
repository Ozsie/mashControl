var mashControl = angular.module('mashControl');

mashControl.controller('MashControlCtrl', function($scope, mashControlRestService) {

  $scope.init = function() {
    Push.Permission.request(function() {
      console.log("Push allowed");
    }, function() {
      console.log("Push blocked");
    });
    $scope.refreshStoredSchedules();
    mashControlRestService.getStatus().then(function(data) {
      $scope.status = data;
      if (data.status === 'running') {
        mashControlRestService.getSchedule().then(function(data) {
          $scope.jsonSchedule = data;
          $scope.startedTime = data.startTime;
          $scope.startTemp = data.steps[0].initialTemp;
          $scope.handleJsonSchedule();
          $scope.inputDisabled = true;
          $scope.startCheckTemp();
          $scope.updateOptions();
          $scope.lastTempUpdate = undefined;
          mashControlRestService.getCurrentTemperature().then(function(data) {
            $scope.currentTempTime = Date.now();
            $scope.currentTemp = data.temperature;
            getTempLog();
          });
        });
      }
    });
  };

  $scope.refreshStoredSchedules = function() {
    mashControlRestService.getStoredSchedules().then(function(data) {
      if (data) {
        $scope.savedSchedules = data.schedules;
        console.log('loaded schedules');
      }
    });
  };

  $scope.selectSchedule = function(schedule) {
    schedule.loaded = true;
    $scope.jsonSchedule = schedule;
    $scope.handleJsonScheduleNoNameUpdate();
  };

  $scope.deleteSchedule = function(schedule) {
    mashControlRestService.deleteSchedule(schedule).then(function(data) {
      $scope.refreshStoredSchedules();
    }, function(error) {
      console.error('Could not delete schedule: ' + error);
    });
  };

  $scope.fetchStartTemp = function() {
    mashControlRestService.getCurrentTemperature().then(function(data) {
      $scope.startTemp = data.temperature;
    }, function(error) {
      $scope.startTemp = 10;
    });
  };

  $scope.start = function() {
    $scope.fetchStartTemp();
    $scope.handleJsonSchedule();
    mashControlRestService.startSchedule($scope.schedule).then(function(data) {
      $scope.startResponse = data;
      $scope.inputDisabled = true;
      $scope.parseInput();
      $scope.startCheckTemp();
      $scope.updateOptions();
      $scope.startedTime = Date.now();
      $scope.lastTempUpdate = undefined;
      $scope.tempLog = [];

      mashControlRestService.getStatus().then(function(data) {
        $scope.status = data;
      });
    });
  };

  $scope.updateOptions = function() {
    for (var index in $scope.options.series) {
      var series = $scope.options.series[index];
      if (series.id === "actual") {
        $scope.options.series.splice(index, 1);
        break;
      }
    }

    $scope.options.series.push({
      axis: "y",
      dataset: "temperature",
      key: "actual",
      label: "Actual",
      color: "hsla(88, 68%, 28%, 1)",
      defined: function(value) {
        return value.y1 !== undefined;
      },
      type: [
        "line"
      ],
      id: "actual"
    });
  };

  $scope.addStepIndicator = function(data, stepIndicator) {
    $scope.removeStepIndicator(stepIndicator.key);
    $scope.options.series.push({
      axis: "y",
      dataset: "temperature",
      key: stepIndicator.key,
      label: stepIndicator.label,
      color: stepIndicator.color,
      defined: function(value) {
        return value.y1 !== undefined;
      },
      type: [
        "area", "line"
      ],
      id: stepIndicator.key
    });

    var m = stepIndicator.start;
    while (m < stepIndicator.end) {
      var s = data.temperature[m];
      if (!s) {
        s = {minute: m};
        data.temperature.push(s);
      }
      s[stepIndicator.key] = stepIndicator.height;
      data.temperature[m] = s;
      m++;
    }
  };

  $scope.removeStepIndicator = function(key) {
    for (var index in $scope.options.series) {
      var series = $scope.options.series[index];
      if (series.id === key) {
        $scope.options.series.splice(index, 1);
        break;
      }
    }
  };

  $scope.stop = function() {
    mashControlRestService.stopSchedule().then(function(data) {
      $scope.inputDisabled = false;
      $scope.running = false;

      mashControlRestService.getStatus().then(function(data) {
        $scope.status = data;
      });
    }, function(err) {
      console.error(err);
    });
  };

  $scope.getSchedule = function() {
    mashControlRestService.getSchedule().then(function(data) {
      $scope.jsonSchedule = data;
    });
  };

  $scope.startCheckTemp = function(runTime) {
    $scope.running = true;
    $scope.updates = 0;
    updateCurrentTemperature();
    updateGraph();
    mashControlRestService.getStatus().then(function(data) {
      $scope.status = data;
    });
    updateStatus();
  };

  $scope.options = {
    margin: {
      top: 5
    },
    series: [
      {
        axis: "y",
        dataset: "temperature",
        key: "expected",
        label: "Expected",
        color: "hsla(88, 48%, 48%, 1)",
        defined: function(value) {
          return value.y1 !== undefined;
        },
        type: [
          "line"
        ],
        id: "expected",
        visible: false
      }
    ],
    axes: {
      x: {
        key: "minute"
      }
    }
  };

  $scope.data = {
    temperature: []
  };

  var updateStatus = function() {
    setTimeout(function() {
      mashControlRestService.getStatus().then(function(data) {
        $scope.status = data;
      });
      updateStatus();
    }, 30000);
  };

  var updateCurrentTemperature = function() {
    setTimeout(function () {
      if (!$scope.running) {
        return;
      }
      $scope.runTime = Math.round((Date.now() - $scope.startedTime) / 1000);
      mashControlRestService.getCurrentTemperature().then(function(data) {
        $scope.currentTempTime = Date.now();
        $scope.currentTemp = data.temperature;
        $scope.updates++;
        var updated = false;
      }, function(error) {
        console.error(error);
      });
      updateCurrentTemperature();
    }, 1000);
  };

  var getTempLog = function() {
    mashControlRestService.getTempLog().then(function(data) {
      var log = data.log;

      if (!$scope.tempLog) {
        $scope.tempLog = [];
      }

      if ($scope.tempLog.length < log.length) {
        for (var index = $scope.tempLog.length; index < log.length; index++) {
          var point = $scope.data.temperature[index];
          var value = log[index];
          if (!point.actual) {
            point.actual = value.temperature;
            $scope.lastTempUpdate = $scope.currentTempTime;
          }
          if ($scope.jsonSchedule.boilSteps && (log.length - $scope.tempLog.length === 1)) {
            for (var boilIndex = 0; boilIndex < $scope.jsonSchedule.boilSteps.length; boilIndex++) {
              var boilStep = $scope.jsonSchedule.boilSteps[boilIndex];
              var actualTime = $scope.totalRunTime - boilStep.time;
              if (actualTime === index) {
                console.log("Time for hops!");
                pushHop(boilStep);
              }
            }
          }
        }
      }

      $scope.tempLog = log;
    });
  };

  var pushHop = function(boilStep) {
    Push.create('Time for hops!', {
      body: "Add " + boilStep.amount + " g of " + boilStep.hop,
      timeout: 30000,
      onClick: function () {
        window.focus();
        this.close();
      }
    });
  };

  var updateGraph = function() {
    setTimeout(function () {
      if (!$scope.running) {
        return;
      }
      getTempLog();
      updateGraph();
    }, 60000);
  };

  //updateCurrentTemperature();

  $scope.calculateRiseTime = true;
  $scope.autoNameSteps = true;

  $scope.parseInput = function() {

    if (!$scope.schedule) {
      return;
    }

    $scope.jsonSchedule = {};
    if ($scope.schedule.constructor == Object) {
      $scope.jsonSchedule = $scope.schedule;
    } else {
      $scope.jsonSchedule = JSON.parse($scope.schedule);
    }

    $scope.handleJsonSchedule();
  };

  $scope.getName = function(step) {
    if (step.temperature >= 35 && step.temperature < 40) {
      return "Acidity";
    } else if (step.temperature >= 40 && step.temperature <= 45) {
      return "Phenol";
    } else if (step.temperature >= 48 && step.temperature <= 52) {
      return "Protein";
    } else if (step.temperature >= 62 && step.temperature <= 70) {
      return "Saccharification";
    } else if (step.temperature > 70 && step.temperature <= 78) {
      return "Mash out";
    } else {
      return "Custom " + step.temperature + " C";
    }
  };

  $scope.getColor = function(index) {
    var x = Math.sin(index + 1) * 10000;
    var rnd = x - Math.floor(x);
    return Math.floor(rnd*16777215).toString(16);
  };

  $scope.calculateStep = function(step, index, values) {

      $scope.addStepIndicator(values.data, {
        key: "step" + index,
        label: step.name,
        color: $scope.getColor(index + 1)
      });

      values.runTime -= 1;
      values.lastTemp = step.temperature;

      var startingTemp = $scope.startTemp;
      if (index > 0) {
        startingTemp = $scope.jsonSchedule.steps[index - 1].temperature;
      }
      if ($scope.calculateRiseTime) {
        if (startingTemp <= step.temperature) {
          joules = 4184 * $scope.jsonSchedule.volume;
          watts = 1800;
          secondsPerDegree = joules/watts;
          minutesPerDegree = secondsPerDegree / 60;
          step.riseTime = Math.ceil((step.temperature - startingTemp) * minutesPerDegree);
        } else {
          step.riseTime = Math.ceil(((startingTemp - step.temperature) * $scope.jsonSchedule.volume) / 0.1);
        }
      }

      if (!step.temperature) {
        return data;
      }
      if (!step.riseTime && !step.time) {
        return data;
      }

      for (i = 0; i < step.riseTime; i++) {
        expected = (((step.temperature - startingTemp) / step.riseTime) * i) + startingTemp;
        point = {
          minute: values.runTime,
          expected: expected,
        };
        point["step" + index] = expected;
        values.data.temperature.push(point);
        values.runTime++;
      }

      for (m = 0; m <= step.time; m++) {
        point = {
          minute: values.runTime,
          expected: step.temperature
        };
        point["step" + index] = step.temperature;
        values.data.temperature.push(point);
        values.runTime += 1;
      }
      if (values.startTime !== 0) {
        values.runTime++;
      }
      $scope.totalRunTime += step.riseTime + step.time;

      return values;
  }

  $scope.calculateSpargePause = function(values) {

    if ($scope.jsonSchedule.spargePause) {
      values.runTime--;

      $scope.addStepIndicator(values.data, stepIndicator = {
        key: "spargePause",
        label: "Sparge Pause",
        color: $scope.getColor(1000)
      });
      $scope.totalRunTime += $scope.jsonSchedule.spargePause;
      for (m = 0; m <= $scope.jsonSchedule.spargePause; m++) {
        point = {
          minute: values.runTime,
          expected: values.lastTemp
        };
        point.spargePause = values.lastTemp;
        values.data.temperature.push(point);
        values.runTime += 1;
      }
      if (values.startTime !== 0) {
        values.runTime++;
      }
    }

    return values;
  }

  $scope.calculateBoilSteps = function(values) {
    if ($scope.jsonSchedule.boilTime) {
      values.runTime--;

      $scope.addStepIndicator(values.data, stepIndicator = {
        key: "boilTime",
        label: "Boil",
        color: $scope.getColor(2000),
      });
      $scope.totalRunTime += $scope.jsonSchedule.boilTime;

      var joules = 4184 * $scope.jsonSchedule.volume;
      var watts = 1800;
      var secondsPerDegree = joules/watts;
      var minutesPerDegree = secondsPerDegree / 60;
      $scope.jsonSchedule.boilRiseTime = Math.ceil((100 - values.lastTemp) * minutesPerDegree);

      for (i = 0; i < $scope.jsonSchedule.boilRiseTime; i++) {
        expected = (((100 - values.lastTemp) / $scope.jsonSchedule.boilRiseTime) * i) + values.lastTemp;
        point = {
          minute: values.runTime,
          expected: expected,
        };
        point.boilTime = expected;
        values.data.temperature.push(point);
        values.runTime++;
      }

      for (m = 0; m <= $scope.jsonSchedule.boilTime; m++) {
        point = {
          minute: values.runTime,
          expected: 100
        };
        point.boilTime = 100;
        values.data.temperature.push(point);

        for (var boilIndex in $scope.jsonSchedule.boilSteps) {
          var boilStep = $scope.jsonSchedule.boilSteps[boilIndex];
          if ($scope.jsonSchedule.boilTime - boilStep.time === m) {
            $scope.addStepIndicator(values.data, stepIndicator = {
              key: "boilStep" + boilIndex,
              label: "Add hops: " + boilStep.hop,
              color: $scope.getColor(3002),
            });

            point["boilStep" + boilIndex] = boilStep.amount;
          }
        }
        values.runTime += 1;
      }
      if (values.startTime !== 0) {
        values.runTime++;
      }
    }

    return values;
  }

  $scope.handleJsonSchedule = function(keepNames) {
    var m;
    var i;
    var point;
    var joules;
    var watts;
    var secondsPerDegree;
    var minutesPerDegree;
    var expected;

    var values = {
      data: {
        temperature: []
      },
      runTime: 1,
      lastTemp: 0,
      startTime: 0
    }

    $scope.totalRunTime = 0;
    if (!$scope.startTemp) {
      $scope.fetchStartTemp();
    }
    for (var index in $scope.jsonSchedule.steps) {
      var step = $scope.jsonSchedule.steps[index];
      if ($scope.autoNameSteps) {
        step.name = $scope.getName(step);
      }
      values = $scope.calculateStep(step, index, values);
    }

    values = $scope.calculateSpargePause(values);

    values = $scope.calculateBoilSteps(values);

    $scope.data = values.data;

    if ($scope.autoNameSteps) {
      $scope.nameGenerator($scope.jsonSchedule);
    }
    $scope.schedule = JSON.stringify($scope.jsonSchedule);
  };

  $scope.handleJsonScheduleNoNameUpdate = function(keepNames) {
    var m;
    var i;
    var point;
    var joules;
    var watts;
    var secondsPerDegree;
    var minutesPerDegree;
    var expected;

    var values = {
      data: {
        temperature: []
      },
      runTime: 1,
      lastTemp: 0,
      startTime: 0
    }

    $scope.totalRunTime = 0;
    if (!$scope.startTemp) {
      $scope.fetchStartTemp();
    }
    for (var index in $scope.jsonSchedule.steps) {
      var step = $scope.jsonSchedule.steps[index];
      values = $scope.calculateStep(step, index, values);
    }

    values = $scope.calculateSpargePause(values);

    values = $scope.calculateBoilSteps(values);

    $scope.data = values.data;

    $scope.schedule = JSON.stringify($scope.jsonSchedule);
  };

  $scope.addStep = function() {
    if (!$scope.jsonSchedule) {
      $scope.jsonSchedule = {steps:[{
          temperature: 0,
          riseTime: 0,
          time: 0
        }],
        volume: 1};
    } else {
      if (!$scope.jsonSchedule.steps) {
        $scope.jsonSchedule.steps = [];
      }
      $scope.jsonSchedule.steps.push({
        temperature: 0,
        riseTime: 0,
        time: 0
      });
    }
    $scope.handleJsonSchedule();
  };

  $scope.addBoil = function() {
    var time = 60;
    if (!$scope.jsonSchedule) {
      $scope.jsonSchedule = {boilSteps:[{
          time: time
        }]};
    } else {
      if (!$scope.jsonSchedule.boilSteps) {
        $scope.jsonSchedule.boilSteps = [];
      }
      time = Math.floor(60 / ($scope.jsonSchedule.boilSteps.length + 1));
      $scope.jsonSchedule.boilSteps.push({
        time: time
      });
    }
    if (!$scope.jsonSchedule.spargePause) {
      $scope.jsonSchedule.spargePause = 15;
    }
    if (!$scope.jsonSchedule.boilTime) {
      $scope.jsonSchedule.boilTime = 60;
    }
    $scope.handleJsonSchedule();
  };

  $scope.removeStep = function(step, index) {
    $scope.jsonSchedule.steps.splice(index, 1);
  };

  $scope.removeBoilStep = function(step, index) {
    $scope.jsonSchedule.steps.splice(index, 1);
  };

  $scope.$watch(function () {
    return $scope.schedule;
  }, $scope.parseInput, true);

  $scope.millisToMinutes = function(millis) {
    var sec = millis/1000;
    return $scope.secondsToMinutes(sec);
  };

  $scope.secondsToMinutes = function(seconds) {
    var min = seconds/60;
    return Math.floor(min);
  };

  $scope.save = function() {
    if (!$scope.jsonSchedule.uuid) {
      mashControlRestService.createSchedule($scope.jsonSchedule).then(function(data) {
        if (data) {
          $scope.jsonSchedule.uuid = data.uuid;
          $scope.refreshStoredSchedules();
        } else {
          console.error('Failed when saving schedule')
        }
      });
    } else {
      mashControlRestService.updateSchedule($scope.jsonSchedule).then(function(data) {
        if (data) {
          $scope.jsonSchedule.uuid = data.uuid;
          $scope.refreshStoredSchedules();
        } else {
          console.error('Failed when saving schedule')
        }
      });
    }
  };

  $scope.saveCopy = function() {
    $scope.jsonSchedule.uuid = undefined;
    mashControlRestService.createSchedule($scope.jsonSchedule).then(function(data) {
      if (data) {
        $scope.jsonSchedule.uuid = data.uuid;
        $scope.refreshStoredSchedules();
      } else {
        console.error('Failed when saving schedule')
      }
    });
  };

  $scope.nameGenerator = function(schedule) {
    if (schedule.loaded) {
      return;
    }
    var name = '';
    var parts = [];
    if (schedule.steps) {
      var mashTime = 0;
      for (var i in schedule.steps) {
        mashTime += schedule.steps[i].riseTime + schedule.steps[i].time;
      }
      parts.push(schedule.steps.length + '-step');
      if (mashTime !== 'NaN') {
        parts.push(mashTime + ' min mash');
      }
    }
    if (schedule.boilTime) {
      parts.push(schedule.boilTime + ' min boil');
    }
    if (schedule.volume) {
      parts.push(schedule.volume + ' l');
    }

    for (var j in parts) {
      name += parts[j];
      if (j < parts.length - 1) {
        name += ', ';
      }
    }
    schedule.name = name;
  };

  $scope.init();
});