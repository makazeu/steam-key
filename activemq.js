const stompit = require('stompit');
const destination = 'sub';

module.exports = (host, port, message) => {

    try {
        stompit.connect( {host: host, port: port}, (err, client) => {
            if (err) {
                return;
            }

            let frame = client.send( {destination: destination} );

            frame.write(message);

            frame.end();

            client.disconnect();
        } );

    } catch(e) {
        // doing nothing...
    }
    
};