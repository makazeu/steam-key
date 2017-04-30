(function (){
    let allTexts = {
        'text_connecting_server': '正在连接激活服务器...',
        'text_connected_server' : '已连接服务器，准备就绪',
        'text_logged_on' : '您已成功登录，Steam ID 3为：',
        'text_logon_failed': '登录失败，原因：',
        'text_server_disconnected': '已和服务器断开连接，请刷新本网页',
        'alert_server_disconnected': '已和服务器断开连接！',
    };

    let allErrors = {
        'InvalidPassword': '无效的密码',
    }

    if (checkWebSocket()) {
        //alert("Your browser supports WebSocket!");
    } else {
        alert("Your browser doesn't support WebSocket!");
    }

    $('#panel_status').text(allTexts['text_connecting_server']);

    let ws;
    doWebSocket();

    let loggedOn = false;

    function checkWebSocket() {
        return 'WebSocket' in window;
    }

    function doWebSocket() {
        let protocol = location.protocol == 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(`${protocol}//${location.host}/ws`);

        ws.onopen = function open() {
            //console.log('WebSocket opened!');
            //ws.send('hello server!');
        };

        ws.onmessage = function (data, flags) {
            console.log('Received: %s', data.data);

            let recvData = JSON.parse(data.data);

            if (recvData.action == 'connect') {
                //console.log('WebSocket connected!');
                $('#panel_status').text(allTexts['text_connected_server']);
                return;
            }

            if (recvData.action == 'logOn') {
                if (recvData.result == 'success') {
                    loggedOn = true;
                    $('#accountInfo').fadeOut();
                    $('.panel-body').text(allTexts['text_logged_on'] + recvData.detail.steamID);
                    //wsRedeem();
                } else if (recvData.result == 'failed') {
                    let errMsg = allErrors[recvData.message] || recvData.message;
                    $('.panel-body').text(allTexts['text_logon_failed'] + errMsg);
                    ws.close();
                }
            }
        };

        ws.onclose = function () {
            $('#panel_status').text(allTexts['text_server_disconnected']);
            //$('#buttonRedeem').attr('disabled', 'disabled');
            $('.form-horizontal').fadeOut();
            //alert(allTexts['alert_server_disconnected']);
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

        if($('#inputKey').val().trim() != '') {
            wsRedeem()
        }
    }

    function wsRedeem() {
        $('.progress').fadeIn();

        let data = JSON.stringify({
            action  : 'redeem',
            key     : $('#inputKey').val().trim()
        });
        ws.send(data);

        $('.progress').fadeOut();
    }

    $('#buttonRedeem').click(function (){
        if (loggedOn) {
            wsRedeem();
        } else {
            wsLogon();
        }
    });
    
})();
