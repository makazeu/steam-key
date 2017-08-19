const express = require('express');
const hbs = require('hbs');
const url = require('url');
const path = require('path');

module.exports = app => {
    // read config file
    let sponsor = '';
    try {
        serverConfig = require('./serverconfig');
        sponsor = serverConfig['sponsor'];
    } catch(err) {
        sponsor = null;
    }

    // template engine
    app.set('view engine', 'hbs');

    // static files
    app.use(express.static(path.join(__dirname, 'public')));

    // routes
    app.get('/', (req, res) => {
        res.render('index', {sponsor : sponsor});
    });
};
