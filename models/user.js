var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var passportLocalMongoose = require('passport-local-mongoose');

var User = new Schema({
	username: String,
	password: String
});

User.plugin(passportLocalMongoose);

// Créé le modèle users pour l'exposer à l'app
module.exports = mongoose.model('users', User);