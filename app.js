// ===== Dépendances =====
var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 8080;
var mongoose = require('mongoose');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var flash = require('connect-flash');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var configDB = require('./config/database');
var _ = require('lodash');
var db;

// Set up des views
app.set('views', './views');
app.set('view engine', 'pug');

// ===== Set up de l'app Express =====
app.use(express.static('public'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: false
}));
app.use(cookieParser()); // Permet la lecture des cookies nécessaires à l'authentification
app.use(require('express-session') ({
	secret: 'expressquizsecretbalblabla',
	resave: false,
	saveUninitialized: false
	// cookie: { secure: true }
}));

// ===== Nécessaires au fontionnement du package Passport =====
app.use(passport.initialize());
app.use(flash());
app.use(passport.session()); // Sessions de login persistentes

// ===== Routes =====
require('./routes/index.js')(app, passport); // Charge les routes et passport dans l'app

// ===== Config passport =====
var User = require('./models/user');
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// ===== Connexion à la db mongoose =====
mongoose.connect(configDB.url);

function startServer() {
	http.listen(port, function() {
		console.log('Le serveur est disponible sur le port ' + port);
	});
}
// On se connecte à la DB
mongoose.connection.on('connected', function() {
	db = mongoose.connection;
	setupDatabase(function (err) { // Exécution de la fonction setupDatabase avec pour paramètre une fonction anonyme
		if (err) { // S'il y a une erreur, on sort
			console.log('Erreur lors du setupDatabase: ', err);
			process.exit(1);
		} else {
			startServer();
		}
	});
});

mongoose.connection.on('error', function(err) {
  console.log('Mongoose connection error: ' + err);
});
mongoose.connection.on('disconnected', function() {
  console.log('Mongoose disconnected');
});

function setupDatabase(callback) { // Déclaration d'une fonction avec pour paramètre 'callback' / 'callback' est ici la fonction anonyme
	var quizCollection = db.collection('questions');
	// Find questions
	quizCollection.find({}).toArray(function(err, questions) {
		if (err) {
			return callback(err); // Exécution de la callback lorsqu'il y a une erreur
		}
		// return === else
		if(questions && questions.length) {
			// console.log('questions are already in DB: ', questions)
			return callback(); // Exécution de la callback sans erreur
		} else {
			var questionsArray = [
				{	text: 'Who am I?',
					img: '/img/Cheschire_Cat.png',
					possibleAnswer: {
						p1: 'Rocky',
						p2: 'Cheschire Cat',
						p3: 'Grumpy Cat',
						p4: 'Garfield'
					},
					correctAnswer: 'Cheschire Cat'
				},
				{	text: 'Who am I?',
					img: '/img/walter-white.png',
					possibleAnswer: {
						p1: 'Darth Vador',
						p2: 'Negan',
						p3: 'Heisenberg',
						p4: 'Saul Goodman'
					},
					correctAnswer: 'Heisenberg'
				},
				{	text: 'Who am I?',
					img: '/img/oph.jpg',
					possibleAnswer: {
						p1: 'Sydney Opera House',
						p2: 'Orient Pearl Tower',
						p3: 'Taj Mahal',
						p4: 'Eiffel Tower'
					},
					correctAnswer: 'Sydney Opera House'
				}

			];

			quizCollection.insertMany(questionsArray, function(err, result) {
				if (err) {
					return callback(err);
				} else {
					console.log('Inserted ' + questionsArray.length + ' questions into the collection');
					return callback();
				}
			});
		}
	});
}

// SOCKET IO
// ======================================================================

// utilisateurs  identifiés connectés en socket
var connectedUsers = [];
var players = [];

io.on('connection', function(socket) {
	//console.log('new socket connected')

	socket.on('disconnect', function() {
		// on retire l'utilisateur du tableau (s'il était connecté)
		connectedUsers = _.reject(connectedUsers, socket);
		// Nb de users connectés après qu'il y ait eu une déconnexion
		socketStatus();
	}); // end socket.on('disconnect')

	socket.on('userAuth', function(user) {
		socket.username = user.username;
		socket.score = 0;
		var userSocketFound = _.find(connectedUsers, { username: user.username });
		// on doit mettre à jour / changer la socket de cet utilisateur, car on autorise qu'une seule connexion socket par utilisteur.
		if (userSocketFound !== undefined) {
			connectedUsers = _.reject(connectedUsers, userSocketFound);
			// On force le disconnect sans attendre le timeout
			userSocketFound.disconnect();
		}
		// Dans tous les cas, on ajoute la bonne (nouvelle) socket de l'utilisateur au tableau
		connectedUsers.push(socket);
		//console.log('Utilisateur déclaré:', user);
		// Msg à l'attention du nouveau user connecté
		socket.emit('newuserconnect', { description: 'Welcome ' + socket.username.toUpperCase() + '!' });
		// Nb de users connectés après une nouvelle connexion
		socketStatus();

	}); // end socket.on('userAuth')

	// Dès qu'il y a au moins 2 joueurs dont le status est set ready à jouer
	socket.on('ready', function(data) {
		players.push(socket);
		if (players.length > 1) {
			startGame();
		} else {
			// Joueur en attente d'un autre joueur
			socket.emit('waiting', {description: 'Waiting for an other player to play' });
		}
	}); // end on socket.on('ready')

	// Lorsqu'un user a soumis une bonne réponse, on ajoute +1 à son score, et on cache la question en cours
	socket.on('rightAnswer', function() {
		socket.score += 1;
		emitToAllPlayers('hideQuestion');
		keepingScore();
		// console.log(socket.username, socket.score);
	})

	// Lorsqu'un user a soumis une mauvaise réponse, on cache la question en cours
	socket.on('wrongAnswer', function() {
		emitToAllPlayers('hideQuestion');
		keepingScore();
	})

}); // end io.on('connection')

// Nombre de users connectés
function socketStatus() {
	io.sockets.emit('status', {
		description : connectedUsers.length + ' user(s) connected',
		users: _.map(connectedUsers, 'username')
	});
} // end function socketStatus

// Lorsque le jeu commence, on récupère les questions dans la db et on affiche la 1ère question
function startGame() {

	emitToAllPlayers('gameStarted', true);
	keepingScore();
	// recupérer question dans db
	var quizCollection = db.collection('questions');
	// // Find questions
	quizCollection.find({}).toArray(function(err, questions) {
		if (err) {
			console.log('Erreur lors de la récupération des questions: ', err);
			process.exit(1);
		} else {
			emitQuestions(questions, 0);
		}
	});
} // End function startGame

// On affiche les questions, l'une après l'autre, en utilisant une fonction récursive (évite de bloquer le thread Node) - permet de faire une boucle sans utiliser de boucle
function emitQuestions(questions, currentQuestionIndex) {
	emitToAllPlayers('question', questions[currentQuestionIndex]);
	setTimeout(function() {
		currentQuestionIndex++;
		if (currentQuestionIndex < questions.length) {
			emitQuestions(questions, currentQuestionIndex);
		} else {
			emitToAllPlayers('hideQuestion');
			//console.log('...end game');
			theWinnerIs();
			players = [];
		}
	}, 4000);
} // End function emitQuestions

// Définit le gagnant
function theWinnerIs() {
	var orderPlayersByScore = _.sortBy(players, 'score').reverse();
	emitToAllPlayers('gameEnded', {text: orderPlayersByScore[0].username.toUpperCase() + ' won'});
} // End function theWinnerIs

// Score de chaque joueur durant le jeu
function keepingScore() {
	for (var i = 0; i < players.length; i++) {
		//console.log(players[i].username + ' | ' + players[i].score);
		emitToAllPlayers('usersScore', {name: players[i].username, score: players[i].score})
	}
} // End function keepingScore

// Fonction permettant d'afficher la data à tous les users loggés et prêts à jouer
function emitToAllPlayers(channel, data) {
	for (var i = 0; i < players.length; i++) {
		players[i].emit(channel, data);
	}
}