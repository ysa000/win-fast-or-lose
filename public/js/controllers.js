'use strict';

/* Controllers */

angular.module('quizApp.controllers', ['quizApp.services'])
	.controller('AppCtrl', function ($scope, socket, userFactory) {
		$scope.connectedUsers = [];
		$scope.players = {};
		$scope.isReady = false;
		$scope.gameStarted = false;
		$scope.gameEnded = false;
		$scope.displayScore = true;

		// On set le scope du user à 'ready'
		$scope.setReady = function() {
			$scope.isReady = true;
			socket.emit('ready');
		};

		// Lorsqu'un user soumet une réponse à la question en cours
		$scope.submitAnswer = function(answer) {
			// console.log('userAnswer', answer);
			if (answer === $scope.question.correctAnswer ) {
				socket.emit('rightAnswer');
				$scope.result = 'Yeah!';
			} else {
				socket.emit('wrongAnswer');
				$scope.result = 'Nope!';
			}
		};

		// Statut du user lorsqu'il charge la page
		socket.on('status', function (data) {
			console.log('status received', data);
			$scope.status = data.description;
			$scope.connectedUsers = data.users;
			$scope.score = data.users.score;
			// console.log('all users: ' + data.users);
		});

		// Statut du user après qu'il se soit loggé
		socket.on('newuserconnect', function (data) {
			// console.log('new client', data);
			$scope.newuserconnect = data.description;
			$scope.userReadyToPlay = data.readyToPlay;
		});

		// Statut du user en attente de jeu
		socket.on('waiting', function(data) {
			console.log('waiting', data);
			$scope.waiting = data.description;
		});

		// Affichage d'une question de la db
		socket.on('question', function(question) {
			// console.log('question ', question);
			$scope.question = question;
			// dans le cas où un autre joueur a répondu avant
			$scope.result = 'You were too late!';
		});

		// Cache la question en cours
		socket.on('hideQuestion', function(text) {
			$scope.question = null;
		});

		// Une fois que le jeu a démarré
		socket.on('gameStarted', function(isGameStarted) {
			console.log('Game started : ' + isGameStarted);
			$scope.gameStarted = isGameStarted;
		});

		// Affichage du score durant le jeu
		socket.on('usersScore', function(displayScore) {
			$scope.players[displayScore.name] = displayScore.score;
		})

		// Fin du jeu
		socket.on('gameEnded', function(isGameEnded) {
			$scope.gameEnded = isGameEnded;
			$scope.message = isGameEnded.text;
			$scope.isReady = false;
			$scope.winnerGif = 'http://i.giphy.com/3o7TKxJRKk8uPOOdgY.gif';
		});

		// Permet de récupérer les infos du user qui vient de se logger
		userFactory.getMe()
		.success(function(response){
			// console.log('response:', response);
			if (response.username) {
				$scope.me = response;
				socket.emit('userAuth', { username: response.username });
			}
		});
	})