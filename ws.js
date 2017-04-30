const WebSocket = require('ws');

module.exports = function(server) {

    const wss = new WebSocket.Server({ server });

    wss.on('connection', function connection(ws) {
        //const location = url.parse(ws.upgradeReq.url, true);
        console.log('Connected!');

        ws.send(JSON.stringify({
            'action': 'connect',
            'result': 'success',
        }));

        let steamUser = require('steam-user');
        let steamClient = new steamUser(ws);

        ws.on('message', function incoming(message) {
            console.log('received: %s', message);
            let data = JSON.parse(message);
            
            if (data.action == 'logOn') {
                steamClient.logOn({
                    'accountName'   : data.username,
                    'password'      : data.password,
                    'twoFactorCode' : data.authcode
                });
                steamClient.once('loggedOn', function(details) {
                    console.log("Logged into Steam as " + steamClient.steamID.getSteam3RenderedID());

                    ws.send(JSON.stringify({
                        'action': 'logOn',
                        'result': 'success',
                        'detail': {
                            'steamID': steamClient.steamID.getSteam3RenderedID()
                        }
                    }));
                });
            } else if (data.action == 'redeem') {
                console.log('Key: %s', data.key);
                if (true) {
                    let resData = { 'action': 'redeem' };

                    steamClient.redeemKey(data.key, function(result, details, packages ){
                        resData['result'] = result;
                        resData['details'] = details;
                        resData['packages'] = packages;

                        resData['test'] = 'test';
                        console.log(resData);
                        ws.send(JSON.stringify(resData));
                    });        
                }
            }
            
            
        });

        ws.on('close', function close(){
            console.log('close!');
        });
    });
}