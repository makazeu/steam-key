const express = require('express');
const hbs = require('hbs');
const url = require('url');
const path = require('path');

module.exports = app => {
    // read config file
    let serverBy;
    let version;
    try {
        let serverConfig = require('./serverconfig');
        serverBy = serverConfig['serverBy'];
        if (serverBy !== undefined && serverBy.trim() === '') serverBy = null;
        let versionFile = require('./version');
        version = versionFile['version'];
    } catch (err) {
        serverBy = null;
        version = 'Unknown version';
    }

    // template engine
    app.set('view engine', 'hbs');

    // static files
    app.use(express.static(path.join(__dirname, 'public')));

    // routes
    app.get('/', (req, res) => {
        res.render('index', {
            serverBy : serverBy,
            appVersion: version,
            nodeVersion: process.version,
        });
    });

    app.get('/run', (req, res) => {
        res.render('run', {
            serverBy : serverBy,
            appVersion: version,
            nodeVersion: process.version,
        });
    });
};
