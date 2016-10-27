// ===== Dépendances =====
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 8080;
var mongoose = require('mongoose');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var flash = require('connect-flash');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var configDB = require('./config/database');


// Set up des views
app.set('views', './views');
app.set('view engine', 'pug');

// ===== Set up de l'app Express =====
app.use(require('express').static('public'));
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

io.on('connection', function(socket) {
	console.log('user connected on win fast or lose');
	socket.on('disconnect', function() {
		console.log('user disconnected from win fast or lose');
	});
});