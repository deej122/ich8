angular.module('ich8App', ['angularMoment', 'infinite-scroll'])
  .controller('FeedCtrl', ['$scope', '$http', '$timeout', 'moment', '$rootScope', function($scope, $http, $timeout, moment, $rootScope) {
      console.log("hi");
      $scope.report_content = {};      
      $rootScope.page_num = 0;
      $rootScope.reports = [];
      $rootScope.totalCount = null;
      $rootScope.new_reports = [];
      $rootScope.showNewReport=false;

      $rootScope.loadingResults = false;
      $scope.endOfResults = false;
      
      //to add new reports to the top of the feed list vs just showing the number
      $scope.exposeNewReports = function() {
        for(i = 0; i < $rootScope.new_reports.length; i++) {
          $rootScope.reports.unshift($rootScope.new_reports[i]);
          $rootScope.totalCount = $rootScope.totalCount + 1;
        }
        $rootScope.new_reports = [];
        $rootScope.latestPost = $rootScope.reports[0].id;
        $rootScope.showNewReport=false;
      }
      //for NEW reports that are made (top)
      //this does not work right now
      $scope.getNewReports = function(){
        console.log($rootScope.latestPost);
        $http({
          method: 'POST',
          url: '/getNewReports',
          data: {
            latest_post: $rootScope.latestPost,
            location: 'all'
          }
        }).then(function(response) {
          console.log(JSON.stringify(response) + "get response");
          console.log(response.data[0].id == $rootScope.latestPost);
          $rootScope.showNewReport = true;
          console.log($rootScope.new_reports.length);
          console.log($rootScope.new_reports);
          if(response.data[0].id == $rootScope.latestPost) {
            $rootScope.showNewReport = false;
          }
          else if($rootScope.new_reports.length > 0) {
            for(i = 0; i <= response.data.length - 2; i++) {
              if($scope.containsId($rootScope.new_reports, response.data[i])) {
                break;
              }
              else {
                $rootScope.new_reports.push(response.data[i]);
              }
            }
          }
          else {
            $rootScope.new_reports = response.data;
            $rootScope.new_reports.pop();
          }
          // $rootScope.totalCount = response.data[response.data.length - 1]['count']
        }, function(error) {
          console.log(error);
        });
        $scope.intervalFunction();
      };
      
      //for INITIAL set of displayed posts
      $scope.getReports = function() {
        //show loading animation
        $rootScope.loadingResults = true;
        $http({
          method: 'POST',
          url: '/getReports',
          data: {
            location: 'all'
          }
        }).then(function(response) {
          console.log(JSON.stringify(response) + "get response");
          $rootScope.reports = response.data;
          //to remove the "count" object so no blank items show in feed
          $rootScope.reports.pop();
          $rootScope.latestPost = $rootScope.reports[0].id;
          //initialize page number to be one since we loaded first ten elements now
          $rootScope.page_num = 1;
          //keep track of total number of reports with this (will tell us when to stop infinite scrolling)
          $rootScope.totalCount = response.data[response.data.length - 1]['count'];
          console.log('count' + $rootScope.totalCount);
          console.log('initial reports ',$scope.reports);
        }, function(error) {
          console.log(error);
        });
        //hide loading animation
        $rootScope.loadingResults = false;
        //start looking for newly created posts every ten seconds
        $scope.intervalFunction();
      };

      //for NEXT reports to show after infinite scroll
      $scope.getMoreReports = function(){
        console.log('page number ' + $rootScope.page_num);
        //if already tried to load next page (check id and also scope variable we set) --> do we need both?
        if(($rootScope.reports[$rootScope.reports.length - 2].id == $rootScope.last_requested) || $rootScope.calledForNextPage == true) {
          console.log('same or already called for next page');
          return;
        }
        //if length of reports (on fe) equals number we have for total reports, stop infinite scroll
        else if($rootScope.reports.length >= $rootScope.totalCount - 1) {
          console.log("end of results");
          $scope.endOfResults = true;
          return;
        }
        //if there are still reports to find and a request is not currently in progress
        else {
          //note that a request is currently in progress
          $rootScope.calledForNextPage = true;
          //show loading animation
          $rootScope.loadingResults = true;
          //after 2 seconds, make request to server for more posts to show (10 more posts)
          $timeout(function() {
            $http({
              method: 'POST',
              url: '/getMoreReports',
              data: {
                page_num: $rootScope.page_num,
                location: 'all'
              }
            }).then(function(response) {
              //note that last requested post is last item in response
              //using length - 2 because of the "count" included in response.data
              //if there is more than one result in the array, there may be more to load
              if(response.data.length > 1) {
                $rootScope.last_requested = response.data[response.data.length - 2].id;  
              }
              //if there is not more than one result, we're done loading so stop infinite scroll
              else {
                console.log("end of results 2");
                $scope.endOfResults = true;
              }
              //reset totalCount to be whatever it is now (in the db -- may have changed in the meantime)
              $rootScope.totalCount = response.data[response.data.length - 1]['count'];
              console.log(response + "get response");
              //add posts to the reports array that is displaying on the page
              for(i = 0; i < response.data.length - 1; i++) {
                $rootScope.reports.push(response.data[i]);
              }
              console.log("length of reports: " + $rootScope.reports.length);
              //increment page_num since we're now on the next page_
              $rootScope.page_num = $rootScope.page_num + 1;
              //note that a request is not currently in progress anymore
              $rootScope.calledForNextPage = false;
              //hide loading animation
              $rootScope.loadingResults = false;
              console.log('more reports ',$scope.reports);
            }, function(error) {
              console.log(error);
            })
          }, 2000)  
        }
      };
      
      $scope.createReport = function(){
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
              $scope.showNewReport = false;
          }, function(error) {
              console.log(error);
          });
      };

      //function to wait ten seconds
      //used to check for new reports only periodically
      $scope.intervalFunction = function(){
        $timeout(function() {
          $scope.getNewReports();
        }, 10000)
      };
      
      //function to find object in array
      $scope.containsId = function(arr, obj) {
        for (var i = 0; i < arr.length; i++) {
          if (arr[i].id === obj.id) {
            return true;
          }
        }
        return false;
      }
      
      //get initial set of reports (10 = one page, to start)
      $scope.getReports();
  }]);