'use strict';

/* Services */

// Demonstrate how to register services
// In this case it is a simple value service.
angular.module('quizApp.services', [])
	.factory('socket', function (socketFactory) {
		return socketFactory();
	})
	.factory('userFactory', function ($http) {
		var currentUser = {};
		currentUser.getMe = function() {
			return $http({
				method: 'GET',
				url: '/api/me'
			});
		}
		return currentUser;
	});