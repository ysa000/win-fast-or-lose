var app = require('express')();
var http = require('http').Server(app);
var passport = require('passport');
var User = require('../models/user');
var io = require('socket.io')(http);


module.exports = function(app, passport) {

	app.get('/', function(req, res) {
		res.render('home', { user : req.user });
	});

	// Page d'accueil avec la desc du jeu
	app.get('/home', function(req, res) {
		res.render('home', { user : req.user });
	});

	// Page d'inscription
	app.get('/register', function(req, res) {
		res.render('register', { });
	});

	app.get('/game', function(req, res) {
		res.render('game', { });
	});

	// Page de confirmation d'inscription
	app.post('/register', function(req, res, next) {
		User.register(new User({ username: req.body.username }), req.body.password, function(err, user) {
			if (err) {
				return res.render('register', { error: err.message });
			}
			passport.authenticate('local')(req, res, function() {
				req.session.save(function(err) {
					if (err) {
						return next(err)
					}
					res.redirect('/home');
				});
			});
		});
	});

	// Page de login
	app.get('/signin', function(req, res) {
		res.render('signin', { user: req.user, error: req.flash('error') });
	});

	// Page de confirmation de login
	app.post('/signin', passport.authenticate('local', { failureRedirect: '/signin', failureFlash: true }),
		function(req, res, next) {
			req.session.save(function(err) {
				if (err) {
					return next(err);
				}
				res.redirect('/home');
			});
		});

	// Déconnexion
	app.get('/logout', function(req, res, next) {
		req.logout();
		req.session.save(function(err) {
			if (err) {
				return next(err);
			}
			res.redirect('/home');
		});
	});

	// Page user loggé
	app.get('/api/me', function(req, res) {
		console.log('req', req.user)
		if (req.isAuthenticated()) {
			res.json(req.user);
		} else {
			res.json({ loggedin: false });
		}
	});

	// Page récup question
	app.get('/api/question', function(req, res) {
		console.log(req, req.question)
		if (req.isAuthenticated()) {
			res.json(req.user);
		} else {
			res.send('not found');
		}
	});

	app.get('/ping', function(req, res) {
		res.status(200).send('pong!');
	});

};