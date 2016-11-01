// function UsersCtrl($scope, socket) {

// 	// ===== Socket listeners
// 	socket.on('connection', function(data) {
// 		$scope.users = data.users;
// 	});

// }

'use strict';

/* Controllers */

angular.module('quizApp.controllers', ['quizApp.services'])
	.controller('AppCtrl', function ($scope, socket, userFactory) {
		socket.on('status', function (data) {
			console.log('status received', data)
			$scope.status = data.description;
		});
		socket.on('newclientconnect', function (data) {
			console.log('new client', data)
			$scope.newclientconnect = data.description;
		});

		userFactory.getMe()
		.success(function(response){
			console.log('response:', response);
			$scope.me = response;

			socket.emit('userAuth', { username: response.username });
		});
	})
