const request = require('request');
const xml = require('xml2js').parseString;

module.exports = (steamId, callback) => {
    let url = `http://steamcommunity.com/profiles/${steamId}/?xml=1`;
    start(url).then( result => callback(result) );
};

async function start(url) {

    try {
        let xmlData = await getXml(url);
        let result = await parseXml(xmlData);

        if(!result || !result['profile']
            || !result['profile']['isLimitedAccount'] ) {
                console.log('Unable to check! Url: ' + url);
                // FIXME
                return 'OK';
            }

        if(result['profile']['isLimitedAccount'][0] == '0') {
            return 'OK';
        } else {
            throw new Error('Limited account');
        }

    } catch (err) {
        return err.message;
    }
}

function getXml(url) {
    return new Promise( (resolve, reject) => {
        //console.log('getting xml...');
        
        request(url, (error, response, body) => {
            if(!error && response.statusCode == 200) {
                //console.log(body);
                resolve(body);
            } else {
                reject("Cannot get the xml");
            }
        });
    });
}

function parseXml(xmlData) {
    return new Promise((resolve, reject) => {
        //console.log('parsing xml...');

        xml(xmlData, (error, result) => {

            if(!error) {
                //console.log(result);
                resolve(result);
            } else {
                reject("Cannot parse the xml");
            }
        } );
    });
}
