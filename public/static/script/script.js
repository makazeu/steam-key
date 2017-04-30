(function (){
    let allTexts = {
        'text_panel_tip': '温馨提醒：请确保本网页处于HTTPS连接中，以保证您的账号安全！',
        'text_connecting_server': '正在连接激活服务器...',
        'text_connected_server' : '已连接到服务器',
        'text_logging_on': '登录中，请稍候...',
        'text_logged_on' : '您已成功登录，Steam ID 3为：',
        'text_logon_failed': '登录失败，原因：',
        'text_redeeming' : '激活中，请稍候...',
        'test_input_incorrect': '喵！请输入正确的信息！',
        'text_server_disconnected': '已和服务器断开连接，请刷新本网页',
        'alert_server_disconnected': '已和服务器断开连接！',
    };

    let allErrors = {
        'InvalidPassword': '无效的密码',
        'TwoFactorCodeMismatch': '安全令错误'
    };

    let allResults = {
        'OK'    : '成功',
        'Fail'  : '失败',
    };

    let allPurchaseResults = {
        'NoDetail': '——',
        'AlreadyPurchased': '已拥有',
        'DuplicateActivationCode': '重复激活',
        'BadActivationCode': '无效激活码',
        'RateLimited': '次数上限'
    };

    if (checkWebSocket()) {
        //alert("Your browser supports WebSocket!");
    } else {
        alert("Your browser doesn't support WebSocket!");
    }

    $('#panel_status').text(allTexts['text_connecting_server']);
    $('.panel-body').text(allTexts['text_panel_tip']);

    let ws;
    doWebSocket();

    let loggedOn = false;
    let keyCount = 0;

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

                $('.form-horizontal').fadeIn();
                return;
            } // recvData.action == connect

            if (recvData.action == 'logOn') {

                $('#buttonRedeem').fadeIn();
                $('.progress').fadeOut();

                if (recvData.result == 'success') {
                    loggedOn = true;
                    $('#accountInfo').fadeOut();
                    $('.panel-body').text(allTexts['text_logged_on'] + recvData.detail.steamID);
                    
                    if( !isBlank( $('#inputKey').val())) {
                        wsRedeem()
                    }
                } 
                else if (recvData.result == 'failed') {
                    let errMsg = allErrors[recvData.message] || recvData.message;
                    $('.panel-body').text(allTexts['text_logon_failed'] + errMsg);
                    ws.close();
                }
            } // recvData.action == logOn

            else if (recvData.action == 'redeem') {
                
                if( $('table').is(':hidden') ) {
                    $('table').fadeIn();
                }

                $('#buttonRedeem').fadeIn();
                $('.progress').fadeOut();
                $('#inputKey').removeAttr('disabled');

                keyCount++;
                
                if(Object.keys(recvData.detail.packages).length == 0) {
                    tableInsertKey(
                        $('#inputKey').val().trim(),
                        allResults[recvData.detail.result] || recvData.detail.result,
                        allPurchaseResults[recvData.detail.details] || recvData.detail.details,
                        0, ''
                    );
                } // packages.length == 0
                else {
                    for (let key in recvData.detail.packages) {
                        if (recvData.detail.packages.hasOwnProperty(key)) {
                            tableInsertKey(
                                $('#inputKey').val().trim(),
                                allResults[recvData.detail.result] || recvData.detail.result,
                                allPurchaseResults[recvData.detail.details] || recvData.detail.details,
                                key,
                                recvData.detail.packages[key]
                            );
                        }
                    }
                } // packages.length != 0
                
            } // recvData.action == logOn
        };

        ws.onclose = function () {
            $('#panel_status').text(allTexts['text_server_disconnected']);

            $('.form-horizontal').fadeOut();
            //alert(allTexts['alert_server_disconnected']);
        };
    }

    function wsLogon() {

        let username = $('#inputUsername').val();
        let password = $('#inputPassword').val();
        let authcode = $('#inputCode').val();
        
        if ( isBlank(username) || isBlank(password) || isBlank(authcode) ) {
            $('.panel-body').text(allTexts['test_input_incorrect']);
            return;
        }

        $('#buttonRedeem').fadeOut();
        $('.progress').fadeIn();
        $('.panel-body').text(allTexts['text_logging_on']);

        let data = JSON.stringify({
            action   : 'logOn',
            username : $('#inputUsername').val().trim(),
            password : $('#inputPassword').val().trim(),
            authcode : $('#inputCode').val().trim()
        });
        ws.send(data);
    }

    function wsRedeem() {
        $('#buttonRedeem').fadeOut();
        $('.progress').fadeIn();
        $('#inputKey').attr('disabled', 'disabled');

        let data = JSON.stringify({
            action  : 'redeem',
            key     : $('#inputKey').val().trim()
        });
        ws.send(data);

        $('.progress').fadeOut();
    }

    function tableInsertKey(key, result, detail, subId, subName) {
        let row = $('<tr></tr>');

        // number
        row.append(`<td>${keyCount}</td>`);
        // key
        row.append(`<td>${key}</td>`);
        // result
        row.append(`<td>${result}</td>`);
        // detail
        row.append(`<td>${detail}</td>`);
        // sub
        if (subId == 0) {
            row.append('<td>——</td>');
        } else {
            row.append(`<td>(${subId}) ${subName}</td>`);
        }

        $('tbody').prepend(row);
    }

    function isBlank(str) {
        return str.trim() == '';
    }

    $('#buttonRedeem').click(function (){
        if (loggedOn) {
            wsRedeem();
        } else {
            wsLogon();
        }
    });
    
})();
