var express = require('express');
var app = express();

app.get('/', function(req, res) {
	res.send('Hello');
});


var myServer = app.listen(8080, function() {
	var hostAddress = myServer.address().address;
	var listeningPort = myServer.address().port;
	console.log('Live on ', hostAddress, listeningPort);
});