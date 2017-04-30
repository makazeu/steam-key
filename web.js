const express = require('express');
const hbs = require('hbs');
const url = require('url');
const path = require('path');

module.exports = function(app) {

    // template engine
    app.set('view engine', 'hbs');

    // static files
    app.use(express.static(path.join(__dirname, 'public')));

    // routes
    app.get('/', function(req, res) {
        res.render('index');
    });
}