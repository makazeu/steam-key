const fs = require('fs');

module.exports = (filename, callback) => {
    fs.readFile(filename, (err, data) => {
        if(err) throw err;

        callback(JSON.parse(data));
    });
};