var mashControl = angular.module('mashControl');

mashControl.controller('MashControlCtrl', function($scope, mashControlRestService) {
  $scope.start = function() {
    mashControlRestService.startSchedule($scope.schedule).then(function(data) {
      $scope.startResponse = data;
    });
  };

  $scope.getSchedule = function() {
    mashControlRestService.getSchedule().then(function(data) {
      $scope.schedule = data;
    });
  };

  var updateCurrentTemperature = function() {
    setTimeout(function () {
      mashControlRestService.getCurrentTemperature().then(function(data) {
        $scope.currentTemp = data;
        $scope.currentTempTime = new Date(data.time);
      });
      updateCurrentTemperature();
    }, 1000);
  };

  updateCurrentTemperature();
});