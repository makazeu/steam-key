const express = require('express');
const http = require('http');

const app = express();
const server = http.createServer(app);


try {
    require('./config');
} catch (err) {
    console.log('请复制config.example.json为config.json并编辑配置！');
    process.exit(1);
}

process.on('uncaughtException', err => console.error(err));

/* Web Server */
let web = require('./web')(app);

/* WebSocket Server */
let ws = require('./ws')(server);

server.listen(3999, () => {
    console.log('Listening on %d', server.address().port);
});
