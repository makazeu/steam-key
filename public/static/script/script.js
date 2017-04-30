(function() {
    
})();

if (checkWebSocket()) {
    //alert("Your browser supports WebSocket!");
} else {
    alert("Your browser doesn't support WebSocket!");
    //return;
}

let ws;
doWebSocket();

function checkWebSocket() {
    return 'WebSocket' in window;
}

function doWebSocket() {
    let protocol = location.protocol == 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${location.host}/ws`);

    ws.onopen = function open() {
        //console.log('WebSocket connected!');
        //ws.send('hello server!');
    };

    ws.onmessage = function (data, flags) {
        console.log('Received: %s', data.data);

        let recvData = JSON.parse(data.data);

        if (recvData.action == 'connect') {
            console.log('WebSocket connected!');
            return;
        }

        if (recvData.action == 'logOn') {
            if (recvData.result == 'success') {
                wsRedeem();
            }
        }
    };

    ws.onclose = function () {
        alert('Closed!');
    };
}

function wsLogon() {
    let data = JSON.stringify({
        action   : 'logOn',
        username : $('#inputUsername').val().trim(),
        password : $('#inputPassword').val().trim(),
        authcode : $('#inputCode').val().trim()
    });
    ws.send(data);
}

function wsRedeem() {
    let data = JSON.stringify({
        action  : 'redeem',
        key     : $('#inputKey').val().trim()
    });
    ws.send(data);
}
