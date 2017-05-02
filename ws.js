const WebSocket = require('ws');
const dm = require('domain');
const checker = require('./check');

module.exports = (server) => {

    const wss = new WebSocket.Server({ server });

    let serverDef = require('./servername');

    wss.on('connection', (ws) => {

        //const location = url.parse(ws.upgradeReq.url, true);
        //console.log('Connected!');

        trySend(ws, JSON.stringify({
            'action': 'connect',
            'result': 'success',
            'server': serverDef ? serverDef.name : 'Unknown',
        }));

        let steamUser = require('steam-user');
        let steamClient = new steamUser(ws);

        ws.on('message', (message) => {

            //console.log('received: %s', message);
            let data = JSON.parse(message);
            
            // request LogOn
            if (data.action == 'logOn') {

                let domain = dm.create();
                domain.on('error', (err) => {
                    sendErrorMsg(ws, 'logOn', err.message);
                });

                domain.run( () => {
                    steamClient.logOn({
                        'accountName'   : data.username.trim(),
                        'password'      : data.password.trim(),
                        'twoFactorCode' : data.authcode.trim()
                    });
                });
                
                steamClient.once('loggedOn', (details) => {
                    //console.log("Logged into Steam as " + steamClient.steamID.getSteam3RenderedID());

                    if (serverDef && serverDef.id.startsWith('cn')) {
                        trySend(ws, JSON.stringify({
                                'action': 'logOn',
                                'result': 'success',
                                'detail': { 'steamID': steamClient.steamID.getSteam3RenderedID() }
                        }));
                        return;
                    }
                    // check if the account is limited
                    checker(steamClient.steamID.getSteamID64(), result => {

                        //console.log(steamClient.steamID.getSteamID64(), result)
                        if(result != 'OK') {
                            sendErrorMsg(ws, 'logOn', result);
                            steamClient.logOff();
                        } 
                        else {
                            trySend(ws, JSON.stringify({
                                'action': 'logOn',
                                'result': 'success',
                                'detail': { 'steamID': steamClient.steamID.getSteam3RenderedID() }
                            }));
                        }
                    });
                });
            } 

            // request Redeem
            else if (data.action == 'redeem') {

                //console.log('Key: %s', data.key);

                let domain = dm.create();
                domain.on('error', (err) => {
                    sendErrorMsg(ws, 'redeem', err.message);
                });

                domain.run( () => {
                    let resData = { 'action': 'redeem', 'detail': {} };

                    steamClient.redeemKey(data.key, (result, details, packages) => {

                        let allResults = require('./Eresult');
                        let allPurchaseResults = require('./EPurchaseResult');
                        
                        resData['detail']['result'] = allResults[result.toString()];
                        resData['detail']['details'] = allPurchaseResults[details.toString()];
                        resData['detail']['packages'] = packages;

                        //console.log(resData);

                        trySend(ws, JSON.stringify(resData));
                    });        
                });
            }  // data.action == redeem
            
        }); // ws.on == message

        ws.on('close', () => {
            steamClient.logOff();
            //console.log('close!');
        });
    });
};

function sendErrorMsg(ws, action, message) {
    try {
        ws.send(JSON.stringify({
            'action' : action,
            'result' : 'failed',
            'message':  message
        }));
    } catch (error) {
        //do nothing
    }
}

function trySend(ws, stuff) {
    try {
        ws.send(stuff);
    } catch (error) {
        //do nothing
    }
}

