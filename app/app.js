angular.module('mashControl', [])
.controller('MashControlCtrl', function($scope) {
  $scope.variable = 1;
  $scope.increment = function() {
    $scope.variable += 1;
  }
});
