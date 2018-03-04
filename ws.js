const WebSocket = require('ws');
const dm = require('domain');
const SteamUser = require('./steam');
const poster = require('./post');

module.exports = server => {

    let serverConfig;
    try {
        serverConfig = require('./config');
    } catch (err) {
        throw new Error('请复制config.example.json为config.json并编辑配置！');
    }

    const wss = new WebSocket.Server({server});

    let allResults = require('./Eresult');
    let allPurchaseResults = require('./EPurchaseResult');

    let isKeepOnline = false;

    wss.on('connection', ws => {
        trySend(ws, JSON.stringify({
            action: 'connect',
            result: 'success',
            server: serverConfig ? serverConfig.name : 'Unknown',
        }));

        let steamClient = new SteamUser();
        steamClient.setWebSocket(ws);
        let lastReceiveTime = new Date().getTime();

        ws.on('message', message => {
            let data;
            try {
                data = JSON.parse(message);
            } catch (err) {
                return;
            }
            if (data.action !== 'hello') {
                lastReceiveTime = new Date().getTime();
            }

            // request LogOn
            if (data.action === 'logOn') {
                if (!data.mode) {
                    if (data.mode === 'keepOnline') {
                        isKeepOnline = true;
                    }
                }

                let domain = dm.create();
                domain.on('error', err => sendErrorMsg(ws, 'logOn', err.message));

                domain.run(() => {
                    steamClient.logOn({
                        accountName: data.username.trim(),
                        password: data.password.trim(),
                        twoFactorCode: data.authcode.trim(),
                        rememberPassword: false,
                        dontRememberMachine: true,
                    });
                });

                steamClient.once('accountInfo', (name, country) => {
                    trySend(ws, JSON.stringify({
                        action: 'logOn',
                        result: 'success',
                        detail: {
                            name: name,
                            country: country,
                        },
                    }));
                });
            }
            // request AuthCode
            else if (data.action === 'authCode') {
                if (!data.authCode || data.authCode.trim() === '') {
                    sendErrorMsg(ws, 'logOn', 'AuthCodeError');
                    return;
                }

                let domain = dm.create();
                domain.on('error', err => sendErrorMsg(ws, 'logOn', err.message));
                domain.run(() => steamClient.emit('inputAuthCode', data.authCode));
            }
            // request Redeem
            else if (data.action === 'redeem') {
                let domain = dm.create();
                domain.on('error', err => sendErrorMsg(ws, 'redeem', err.message));

                domain.run(() => {
                    // REDEEMING STARTS
                    data.keys.forEach(keyElement => {
                        steamClient.redeemKey(keyElement, (result, details, packages) => {
                            let resData = {action: 'redeem', detail: {}};
                            resData['detail']['key'] = keyElement;
                            resData['detail']['result'] = allResults[result];
                            resData['detail']['details'] = allPurchaseResults[details];
                            resData['detail']['packages'] = packages;
                            trySend(ws, JSON.stringify(resData));

                            // report sub info via http post
                            if (allResults[result] === 'OK' && serverConfig
                                && serverConfig.enableRecord) {
                                for (let subId in packages) {
                                    if (packages.hasOwnProperty(subId)) {
                                        poster(serverConfig.recordUrl,
                                            parseInt(subId),
                                            packages[subId],
                                            serverConfig.id);
                                        break;
                                    }
                                }
                            }
                        });
                    });
                    // REDEEMING ENDS
                });
            }  // data.action == redeem
            else if (data.action === 'hello') {
                trySend(ws, JSON.stringify({action: 'hello!'}));
                let interval = (new Date().getTime() - lastReceiveTime) / 1000;
                if (interval > 900 && !isKeepOnline) {
                    ws.close();
                }
            }
        }); // ws.on == message

        ws.on('close', () => steamClient.logOff());
    });
};

function sendErrorMsg(ws, action, message) {
    try {
        ws.send(JSON.stringify({
            action: action,
            result: 'failed',
            message: message
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

