angular.module('ich8App', ['ngRoute', 'angularMoment'])
  .config(function($locationProvider, $routeProvider) {
    $locationProvider.html5Mode(true);
  })
  .controller('LocationFeedCtrl', ['$scope', '$http', '$timeout', '$location', 'moment', '$rootScope', function($scope, $http, $timeout, $location, moment, $rootScope) {
      $scope.report_content = {};      
      $rootScope.page_num = 0;
      $rootScope.reports = [];
      $rootScope.totalCount = null;
      $rootScope.new_reports = [];
      $rootScope.showNewReport=false;

      $rootScope.loadingResults = false;
      $scope.endOfResults = false;    
      
      $scope.getReports = function(){
        var location = $location.path();
        while(location.charAt(0) === '/')
            location = location.substr(1);
        $rootScope.location = location;
        console.log($location);
        $http({
          method: 'POST',
          url: '/getReports',
          data: {
            'location': location
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
      $scope.intervalFunction = function(){
        $timeout(function() {
          $scope.getReports();
        }, 10000)
      };

      $scope.getNewReports = function(){
        console.log($rootScope.latestPost);
        $http({
          method: 'POST',
          url: '/getNewReports',
          data: {
            latest_post: $rootScope.latestPost,
            location: $rootScope.location
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
                location: $rootScope.location
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
      
      //create google map on callback from google map api (called in the url)
      initMap = function(){
        console.log('hi');
        var map = new google.maps.Map(document.getElementById('map'), {
          zoom: 10
        });
        var geocoder = new google.maps.Geocoder();
        
        $scope.geocodeAddress(geocoder, map);
      }
      
      $scope.getLocationTitle = function(result){
        //if there is a county included in the response
        if(Object.keys(result.address_components).length > 4) {
          var zip = result.address_components[0].short_name;
          var city = result.address_components[1].short_name;
          var county = result.address_components[2].short_name;
          var state = result.address_components[3].short_name;
          var country = result.address_components[4].short_name;
          $scope.locationTitle = city + ', ' + state;
        }
        //if there is no county included in the response
        else {
          var zip = result.address_components[0].short_name;
          var city = result.address_components[1].short_name;
          var state = result.address_components[2].short_name;
          var country = result.address_components[3].short_name;
          $scope.locationTitle = city + ', ' + state;
        }
        //apply to scope now instead of waiting for scope to update
        $scope.$apply();
      }
      
      //add pin to google map on location based on url (zipcode)
      $scope.geocodeAddress = function(geocoder, resultsMap) {
        console.log('yoyo');
        var address = $location.path();
        geocoder.geocode({'address': address}, function(results, status) {
          if (status === 'OK') {
            console.log(results);
            var result = results[0];
            $scope.getLocationTitle(result);
            resultsMap.setCenter(results[0].geometry.location);
            var marker = new google.maps.Marker({
              map: resultsMap,
              position: results[0].geometry.location
            });
          } else {
            alert('Geocode was not successful for the following reason: ' + status);
          }
        });
      }
      
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
      
      //load in initial reports
      $scope.getReports();
  }]);