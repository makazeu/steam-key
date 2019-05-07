const request = require('request');

module.exports = (postAddress, subId, subName, serverId) => {
    let options = {
        uri: postAddress,
        method: 'POST',
        timeout: 20000,
        json: {
            subId: subId,
            subName: subName,
            server: serverId
        }
    };

    start(options);
};


async function start(options) {
    try {
        for (let i = 1; i <= 3; i++) {
            let res = await doPost(options);
            if (res === 'OK') {
                break;
            }
        }
    } catch (error) {
        //console.log(error);
    }
}

function doPost(options) {
    return new Promise((resolve, reject) => {
        request(options, (error, response, body) => {
            if (!error) {
                resolve(body);
            } else {
                reject(error);
            }
        });
    });
}
