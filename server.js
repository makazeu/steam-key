const express = require('express');
const http = require('http');

const app = express();
const server = http.createServer(app);

/* Web Server */
let web = require('./web')(app);

/* WebSocket Server */
let ws = require('./ws')(server);


server.listen(3999, () => {
    console.log('Listening on %d', server.address().port);
});