const WebSocket = require('ws');
const dm = require('domain');
const checker = require('./check');
const poster = require('./post');

module.exports = (server) => {
    
    let serverConfig;
    try {
        serverConfig = require('./serverconfig');
    } catch(err) {
        throw new Error('请编辑serverconfig.example.json文件改名为serverconfig.json！');
    }

    const wss = new WebSocket.Server({ server });
    
    let allResults = require('./Eresult');
    let allPurchaseResults = require('./EPurchaseResult');

    wss.on('connection', (ws) => {
        trySend(ws, JSON.stringify({
            'action': 'connect',
            'result': 'success',
            'server': serverConfig ? serverConfig.name : 'Unknown',
        }));

        let steamUser = require('./steam');
        let steamClient = new steamUser();
        steamClient.setWebSocket(ws);

        ws.on('message', message => {
            let data;
            try {
                data = JSON.parse(message);
            } catch (err) {
                return;
            }

            // request LogOn
            if (data.action === 'logOn') {
                let domain = dm.create();
                domain.on('error', (err) => sendErrorMsg(ws, 'logOn', err.message));

                domain.run( () => {
                    steamClient.logOn({
                        'accountName'   : data.username.trim(),
                        'password'      : data.password.trim(),
                        'twoFactorCode' : data.authcode.trim()
                    });
                });
                
                steamClient.once('loggedOn', (details) => {
                    //if (serverConfig && ( serverConfig.id.startsWith('cn') || serverConfig.id.startsWith('test') )) {
                    // noinspection ConstantIfStatementJS
                    if (true) {
                        trySend(ws, JSON.stringify({
                                'action': 'logOn',
                                'result': 'success',
                                'detail': { 'steamID': steamClient.steamID.getSteam3RenderedID() }
                        }));
                        return;
                    }
                    // check if the account is limited
                    checker(steamClient.steamID.getSteamID64(), result => {
                        if(result !== 'OK') {
                            sendErrorMsg(ws, 'logOn', result);
                            steamClient.logOff();
                        } else {
                            trySend(ws, JSON.stringify({
                                'action': 'logOn',
                                'result': 'success',
                                'detail': { 'steamID': steamClient.steamID.getSteam3RenderedID() }
                            }));
                        }
                    });
                });
            }
            // request AuthCode
            else if (data.action === 'authCode') {
                if (!data.authCode || data.authCode.trim() === '') {
                    sendErrorMsg(ws, 'logOn', 'AuthCodeError');
                    return;
                }

                let domain = dm.create();
                domain.on('error', (err) => sendErrorMsg(ws, 'logOn', err.message));
                domain.run( () => steamClient.emit('inputAuthCode', data.authCode));
            }
            // request Redeem
            else if (data.action === 'redeem') {
                let domain = dm.create();
                domain.on('error', (err) => sendErrorMsg(ws, 'redeem', err.message));

                domain.run( () => {
                    // REDEEMING STARTS
                    data.keys.forEach( keyElement => {
                        steamClient.redeemKey( keyElement, (result, details, packages) => {
                            let resData = { 'action': 'redeem', 'detail': {} };
                            resData['detail']['key'] = keyElement;
                            resData['detail']['result'] = allResults[result.toString()];
                            resData['detail']['details'] = allPurchaseResults[details.toString()];
                            resData['detail']['packages'] = packages;
                            trySend(ws, JSON.stringify(resData));

                            // send sub info via post
                            if( result == 1 && serverConfig && serverConfig.log_enabled ) {
                                for (let subId in packages) {
                                    if (packages.hasOwnProperty(subId)) {
                                        poster(serverConfig.post_address, 
                                            parseInt(subId),
                                            packages[subId],
                                            serverConfig.id);
                                        break;
                                    }
                                }
                            }
                        } );
                    } );
                    // REDEEMING ENDS
                });
            }  // data.action == redeem
            // request hello
            else if (data.action === 'hello') {
                trySend(ws, JSON.stringify({action: 'hello!'}));
            }
        }); // ws.on == message

        ws.on('close', () => steamClient.logOff());
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
        // do nothing...
    }
}

function trySend(ws, stuff) {
    try {
        ws.send(stuff);
    } catch (error) {
        // do nothing...
    }
}

