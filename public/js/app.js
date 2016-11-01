'use strict';

// Declare app level module which depends on filters, and services

angular.module('quizApp', [
	'ngRoute',
	'quizApp.controllers',
	'quizApp.services',
	'quizApp.directives',

	// 3rd party dependencies
	'btford.socket-io'
]).
config(function ($routeProvider, $locationProvider) {
	$routeProvider.
		when('/home', {
			templateUrl: 'home',
			controller: 'AppCtrl'
		});
	$locationProvider.html5Mode(true);
});