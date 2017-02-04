var mashControl = angular.module('mashControl');

mashControl.controller('MashControlCtrl', function($scope, mashControlRestService) {
  $scope.start = function() {
    mashControlRestService.startSchedule($scope.schedule).then(function(data) {
      $scope.startResponse = data;
      $scope.inputDisabled = true;
      $scope.parseInput();
      $scope.startCheckTemp($scope.totalRunTime);
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

  var updateCurrentTemperature = function(runTime) {
    setTimeout(function () {
      if (!$scope.running) {
        return;
      }
      mashControlRestService.getCurrentTemperature().then(function(data) {
        $scope.currentTemp = data;
        $scope.currentTempTime = new Date(data.time);
        if ($scope.updates % 60 === 0) {
          var rows = $scope.tempChart.data.rows;
          var minute = $scope.updates/60;
          var updated = false;
          var insertIndex = -1;
          for (var rowIndex in rows) {
            var row = rows[rowIndex];
            if (row.c[0].v > minute) {
              insertIndex = rowIndex;
              break;
            }
            if (row.c[0].v === minute) {
              var val = {
                "v": data.temperature.celcius
              }
              row.c.push(val);
              updated = true;
              break;
            }
          }
          if (!updated) {
            var val = {
              c: [
                {v: minute},
                {v: 0},
                {v: data.temperature.celcius}
              ]
            }
            if (insertIndex === -1) {
              rows.push(val);
            } else {
              rows.splice(insertIndex, 0, val);
            }
          }

          if (minute >= runTime) {
            console.log("Done!");
            $scope.running = false;
            $scope.inputDisabled = false;
            return;
          }
        }
        $scope.updates++;
      });
      updateCurrentTemperature(runTime);
    }, 1000);
  };

  //updateCurrentTemperature();

  $scope.tempChart = {};

  $scope.parseInput = function() {
    $scope.tempChart.data.rows = {};

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
    var rows = [
      {
        c: [
          {v: 0},
          {v: 0}
        ]
      }
    ];
    var runTime = 0;
    $scope.totalRunTime = 0;
    for (var index in $scope.jsonSchedule.steps) {
      var step = $scope.jsonSchedule.steps[index];
      runTime += step.riseTime;
      rows.push({
        c: [
          {v: runTime},
          {v: step.temperature}
        ]
     });

      for (var m = 1; m <= step.time; m++) {
        runTime += 1;

        rows.push({
          c: [
            {v: runTime},
            {v: step.temperature}
          ]
        });
      }
      $scope.totalRunTime += step.riseTime + step.time;
    }

    $scope.tempChart.data.rows = rows;
  };

  $scope.addStep = function() {
    if (!$scope.jsonSchedule) {
      $scope.jsonSchedule = {steps:[{}]};
    } else {
      $scope.jsonSchedule.steps.push({});
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