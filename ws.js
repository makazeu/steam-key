const WebSocket = require('ws');
const domain = require('domain');
const SteamUser = require('./steam');
const poster = require('./post');
const config = require('./config');
const resultEnum = require('./Eresult');
const purchaseResultEnum = require('./EPurchaseResult');

module.exports = server => {
    const wss = new WebSocket.Server({server});
    wss.on('connection', ws => {
        wsSend(ws, {
            action: 'connect',
            result: 'success',
            server: config ? config.name : 'Unknown',
        });

        let steamClient = new SteamUser();
        steamClient.setWebSocket(ws);

        ws.on('message', message => dispatchMessage(ws, steamClient, message));
        ws.on('close', () => steamClient.logOff());
    });
};

function dispatchMessage(ws, steam, message) {
    let data = parseJSON(message);
    if (!data.action) return;

    switch (data.action) {
        case 'ping':
            pong(ws, data);
            break;
        case 'logOn':
            doLogOn(ws, steam, data);
            break;
        case 'authCode':
            doAuth(ws, steam, data);
            break;
        case 'redeem':
            doRedeem(ws, steam, data);
            break;
        default:
            return;
    }
}

function pong(ws, data) {
    wsSend(ws, {
        action: 'pong',
        count: data.count || 0,
    });
}

function doLogOn(ws, steam, data) {
    runSafely(ws, 'logOn', () => {
        steam.logOn({
            accountName: data.username.trim(),
            password: data.password.trim(),
            twoFactorCode: data.authcode.trim(),
            rememberPassword: false,
            dontRememberMachine: true,
        });
    });
    steam.once('accountInfo', (name, country) => {
        wsSend(ws, {
            action: 'logOn',
            result: 'success',
            detail: {
                name: name,
                country: country,
            },
        });
    })
}

function doAuth(ws, steam, data) {
    if (!data.authCode || data.authCode.trim() === '') {
        wsSendError(ws, 'logOn', 'AuthCodeError');
        return;
    }
    runSafely(ws, 'logOn', () => steam.emit('inputAuthCode', data.authCode));
}

function doRedeem(ws, steam, data) {
    runSafely(ws, 'redeem', () => {
        data.keys.forEach(async key => redeemKey(steam, key).then(res => {
            wsSend(ws, res);
            if (config && config.enableLog) {
                for (let subId in res.detail.packages) {
                    if (res.detail.packages.hasOwnProperty(subId)) {
                        poster(config.postUrl, subId, res.detail.packages[subId], config.id);
                        break;
                    }
                }
            }
        }));
    });
}

function redeemKey(steam, key) {
    return new Promise(resolve => {
        steam.redeemKey(key, (result, detail, packages) => {
            resolve({
                action: 'redeem',
                detail: {
                    key: key,
                    result: resultEnum[result],
                    detail: purchaseResultEnum[detail],
                    packages: packages,
                },
            });
        });
    })
}

function wsSendError(ws, action, message) {
    wsSend(ws, {
        action: action,
        result: 'failed',
        message: message
    });
}

function wsSend(ws, stuff) {
    try {
        let data = typeof stuff === 'string' ? stuff : JSON.stringify(stuff);
        ws.send(data);
    } catch (error) {
        // do nothing...
    }
}

function runSafely(ws, action, runnable, ...parameters) {
    let dm = domain.create();
    dm.on('error', err => wsSendError(ws, action, err.message || 'something went wrong...'));
    parameters && parameters.forEach(p => dm.add(p));
    dm.run(runnable);
}

function parseJSON(json, defaultValue = {}) {
    try {
        return JSON.parse(json);
    } catch (ex) {
        return defaultValue;
    }
}
