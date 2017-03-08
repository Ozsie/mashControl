var mashControl = angular.module('mashControl');

mashControl.controller('MashControlCtrl', function($scope, mashControlRestService) {
  $scope.start = function() {
    mashControlRestService.startSchedule($scope.schedule).then(function(data) {
      $scope.startResponse = data;
      $scope.inputDisabled = true;
      $scope.parseInput();
      $scope.startCheckTemp($scope.totalRunTime);
      $scope.updateOptions();
      $scope.startedTime = Date.now();
      $scope.lastTempUpdate = undefined;
    });
  };

  $scope.updateOptions = function() {
    for (var index in $scope.options.series) {
      var series = $scope.options.series[index];
      if (series.id === "actual") {
        $scope.options.series.splice(index, 1);
        break;
      };
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

  $scope.stop = function() {
    mashControlRestService.stopSchedule().then(function(data) {
      console.log(data);
    });
  };

  $scope.getSchedule = function() {
    mashControlRestService.getSchedule().then(function(data) {
      $scope.schedule = data;
    });
  };

  $scope.startCheckTemp = function(runTime) {
    $scope.running = true;
    $scope.updates = 0;
    updateCurrentTemperature(runTime);
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
        id: "expected"
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

  var updateCurrentTemperature = function(runTime) {
    setTimeout(function () {
      if (!$scope.running) {
        return;
      }
      $scope.runTime = Math.round((Date.now() - $scope.startedTime) / 1000);
      mashControlRestService.getCurrentTemperature().then(function(data) {
        $scope.currentTempTime = data.time;
        $scope.currentTemp = data;
        var now = Date.now();
        var timeChange = now - $scope.lastTempUpdate;
        if (!$scope.lastTempUpdate || timeChange >= 60000) {
          $scope.lastTempUpdate = Date.now();
          var minute = $scope.updates;
          $scope.updates++;
          var updated = false;

          for (var index in $scope.data.temperature) {
            var point = $scope.data.temperature[index];
            if (point.minute === minute) {
              point.actual = data.temperature.celcius;
            }
          }

          if (minute >= runTime) {
            console.log("Done!");
            $scope.running = false;
            $scope.inputDisabled = false;
            return;
          }
        }
      });
      updateCurrentTemperature(runTime);
    }, 1000);
  };

  //updateCurrentTemperature();

  $scope.tempChart = {};
  $scope.calculateRiseTime = true;

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

  $scope.handleJsonSchedule = function() {
    var data = {
      temperature: []
    };
    var runTime = 0;
    $scope.totalRunTime = 0;
    for (var index in $scope.jsonSchedule.steps) {
      var step = $scope.jsonSchedule.steps[index];
      var startingTemp = 10;
      if (index > 0) {
        startingTemp = $scope.jsonSchedule.steps[index - 1].temperature;
      }
      if ($scope.calculateRiseTime) {
        if (startingTemp <= step.temperature) {
          step.riseTime = Math.ceil(((step.temperature - startingTemp) * $scope.jsonSchedule.volume) / 8);
        } else {
          step.riseTime = Math.ceil(((startingTemp - step.temperature) * $scope.jsonSchedule.volume) / 0.1);
        }
      }

      if (!step.temperature) {
        continue;
      }
      if (!step.riseTime && !step.time) {
        continue;
      }

      for (var i = 0; i < step.riseTime; i++) {
        var expected = (((step.temperature - startingTemp) / step.riseTime) * i) + startingTemp;
        data.temperature.push({
          minute: runTime,
          expected: expected
        });
        runTime++;
      }

      for (var m = 0; m <= step.time; m++) {
        data.temperature.push({
          minute: runTime,
          expected: step.temperature
        });
        runTime += 1;
      }
      $scope.totalRunTime += step.riseTime + step.time;
    }

    $scope.data = data;
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
  };

  $scope.removeStep = function(step, index) {
    $scope.jsonSchedule.steps.splice(index, 1);
  };

  $scope.$watch(function () {
    return $scope.schedule;
  }, $scope.parseInput, true);

  $scope.tempChart.type = "LineChart";
  $scope.tempChart.data = {
    "cols": [
      {id: "time", label: "time", type: "number"},
      {id: "expected", label: "Expected", type: "number"},
      {id: "actual", label: "Actual", type: "number"}
    ],
    "rows": []
  };

  $scope.tempChart.options = {
    "title": "Mash Temperature",
    "fill": 20,
    "displayExactValues": true,
    "vAxis": {
        "title": "Temperature",
        "gridlines": {"count": 6}
    },
    "hAxis": {
        "title": "Time"
    }
  };

});