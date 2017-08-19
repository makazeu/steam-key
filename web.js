const express = require('express');
const hbs = require('hbs');
const url = require('url');
const path = require('path');

module.exports = app => {
    // read config file
    let serverBy = null;
    try {
        serverConfig = require('./serverconfig');
        serverBy = serverConfig['serverBy'];
        if (serverBy.trim() === '') serverBy = null;
    } catch(err) {
        serverBy = null;
    }

    // template engine
    app.set('view engine', 'hbs');

    // static files
    app.use(express.static(path.join(__dirname, 'public')));

    // routes
    app.get('/', (req, res) => {
        res.render('index', {serverBy : serverBy});
    });
};
