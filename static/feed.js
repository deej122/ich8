angular.module('ich8App', [])
  .controller('FeedCtrl', function($scope, $http) {
      console.log("hi");
      $scope.report_content = {};      
      
      $scope.getReports = function(){
        $http({
          method: 'POST',
          url: '/getReports',
        }).then(function(response) {
          console.log(response + "get response");
          $scope.reports = response.data;
          console.log($scope.reports);
          console.log('reports',$scope.reports);
        }, function(error) {
          console.log(error);
        });
      };
      
      $scope.getReports();

      $scope.createReport = function() {
          $http({
              method: 'POST',
              url: '/createReport',
              data: {
                  info: $scope.report_content
              }
          }).then(function(response) {
              console.log("response: " + response);
              $scope.getReports();
              $scope.report_content = {}
          }, function(error) {
              console.log(error);
          });
      };

  })