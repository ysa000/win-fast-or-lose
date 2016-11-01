'use strict';

/* Directives */

angular.module('quizApp.directives', []).
	directive('appVersion', function (version) {
		return function(scope, elm, attrs) {
			elm.text(version);
		};
	});