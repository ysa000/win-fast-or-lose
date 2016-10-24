var express = require('express');
var passport = require('passport');
var User = require('../models/user');

var app = express();

module.exports = function(app, passport) {

	// Page d'accueil avec la desc du jeu
	app.get('/home', function(req, res) {
		res.render('home', { user : req.user });
	});

	// Page d'inscription
	app.get('/register', function(req, res) {
		res.render('register', { });
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
		res.render('signin', { user: req.user, error: req.flash('error')});
	});

	// Page de confirmation de login
	app.post('/signin', passport.authenticate('local', {failureRedirect: '/signin', failureFlash: true }),
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

	app.get('/ping', function(req, res) {
		res.status(200).send('pong!');
	});

};