const express = require('express');
const hbs = require('hbs');
const path = require('path');

module.exports = app => {
    // read config file
    let version;
    try {
        version = require('./version').version;
    } catch (err) {
        version = 'UnknownVersion';
    }

    // template engine
    app.set('view engine', 'hbs');

    // static files
    app.use(express.static(path.join(__dirname, 'public')));

    // routes
    app.get('/', (req, res) => {
        res.render('index', {
            appVersion: version,
            nodeVersion: process.version,
        });
    });
};
