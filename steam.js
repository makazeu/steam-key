let SteamUser = require('steam-user');

module.exports = SteamUser;

SteamUser.prototype.setWebSocket = function (webSocket) {
    this.webSocket = webSocket;
};


/**
 * overrides _steamGuardPrompt method to support WebSocket
 * @param domain
 * @param lastCodeWrong
 * @param {steamGuardCallback} callback
 */
SteamUser.prototype._steamGuardPrompt = function (domain, lastCodeWrong, callback) {
    if (this.options.promptSteamGuardCode) {
        this.authCode = null;
        try {
            this.webSocket.send(JSON.stringify({action: 'authCode'}));
        } catch (err) {
            // TODO
        }

        this.once('inputAuthCode', code => callback(code));
    } else {
        this.emit('steamGuard', domain, callback, lastCodeWrong);
    }
};

/**
 * @callback steamGuardCallback
 * @param {string} authCode
 * @return undefined
 */
