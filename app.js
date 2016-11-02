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


// Set up des views
app.set('views', './views');
app.set('view engine', 'pug');

// ===== Set up de l'app Express =====
app.use(express.static('public'));
app.use(express.static('node_modules'));

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
mongoose.connection.on('connected', function() { //
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
	var db = mongoose.connection;
	var quizCollection = db.collection('questions');
	// Find questions
	quizCollection.find({}).toArray(function(err, questions) {
		if (err) {
			callback(err); // Exécution de la callback lorsqu'il y a une erreur
		}
		if(questions && questions.length) {
			// There are already questions in there
			console.log('questions are already in DB: ', questions)
			callback(); // Exécutation de la callback sans erreur
		} else {
			// We need to add them
			var questionsArray = [
				{
					text: 'Who am I?',
					answer: 'Rocky'
				}, {
					text: 'Which city do you live in?',
					answer: 'Paris'
				}, {
					text: 'What\'s your favorite activity?',
					answer: 'Sleeping'
				}
			];

			quizCollection.insertMany(questionsArray, function(err, result) {
				if (err) {
					callback(err);
				} else {
					console.log('Inserted ' + questionsArray.length + ' questions into the collection');
					callback();
				}
			});
		}
	});
}

// utilisateurs  identifiés connectés en socket
var connectedUsers = [];

io.on('connection', function(socket) {
	console.log('new socket connected')

	socket.on('disconnect', function() {
		// on retire l'utilisateur du tableau (s'il était connecté)
		connectedUsers = _.reject(connectedUsers, socket);

		// Nb de users connectés après une déco
		socketStatus();

	});

	socket.on('userAuth', function(user) {

		socket.username = user.username;

		var userSocketFound = _.find(connectedUsers, { username: user.username });

		// on doit mettre à jour / changer la socket de cet utilisateur, car on autorise qu'une seule connexon socket par utilisteur.
		if (userSocketFound !== undefined) {
			connectedUsers = _.reject(connectedUsers, userSocketFound);

			// On force le disconnect sans attendre le timeout
			userSocketFound.disconnect();
		}

		// Dans tous les cas, on ajoute la bonne (nouvelle) socket de l'utilisateur au tableau
		connectedUsers.push(socket);

		console.log('Utilisateur déclaré:', user);

		// Bienvenue au nouveau client connecté
		socket.emit('newuserconnect', { description: 'You are currently logged in as ' + socket.username + ' !' });

		// Nb de users connectés après une connexion
		socketStatus();
	})

});

function socketStatus() {
	io.sockets.emit('status', {
		description : 'There are ' + connectedUsers.length + ' users connected',
		users: _.map(connectedUsers, 'username')
	});
}
