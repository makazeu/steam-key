( () => {

    "use strict";

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
        'prompt_input_authcode': '请输入手机令牌或邮箱验证码',
    };

    let allErrors = {
        'InvalidPassword': '无效的密码',
        'TwoFactorCodeMismatch': '安全令错误',
        'Limited account': '受限用户暂无法使用',
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
        'RateLimited': '次数上限',
        'DoesNotOwnRequiredApp': '缺少主游戏',
        'RestrictedCountry': '区域限制',
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
    let keySuccess = 0;

    function checkWebSocket() {
        return 'WebSocket' in window;
    }

    function doWebSocket() {
        let protocol = location.protocol == 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(`${protocol}//${location.host}/ws`);

        ws.onopen = () => {
            //console.log('WebSocket opened!');
            //ws.send('hello server!');
        };

        ws.onmessage = (data, flags) => {
            //console.log('Received: %s', data.data);

            let recvData = JSON.parse(data.data);

            if (recvData.action == 'connect') {
                //console.log('WebSocket connected!');
                $('#panel_status').text(allTexts['text_connected_server'] + `(${recvData.server})`);

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
                        wsRedeem();
                    }
                } 
                else if (recvData.result == 'failed') {
                    let errMsg = allErrors[recvData.message] || recvData.message;
                    $('.panel-body').text(allTexts['text_logon_failed'] + errMsg);
                    ws.close();
                }
            } // recvData.action == logOn

            else if (recvData.action == 'authCode') {
                let authCode = prompt(allTexts['prompt_input_authcode']);
                ws.send(JSON.stringify({
                    action: 'authCode',
                    authCode: authCode
                }));
            } // recvData.action == authCode

            else if (recvData.action == 'redeem') {
                
                if( $('table').is(':hidden') ) {
                    $('table').fadeIn();
                }

                $('#buttonRedeem').fadeIn();
                $('.progress').fadeOut();
                $('#inputKey').removeAttr('disabled');
                
                if(Object.keys(recvData.detail.packages).length == 0) {
                    tableUpdateKey(
                        recvData.detail.key,
                        allResults[recvData.detail.result] || recvData.detail.result,
                        allPurchaseResults[recvData.detail.details] || recvData.detail.details,
                        0, ''
                    );
                } // packages.length == 0
                else {
                    for (let subId in recvData.detail.packages) {
                        if (recvData.detail.packages.hasOwnProperty(subId)) {
                            tableUpdateKey(
                                recvData.detail.key,
                                allResults[recvData.detail.result] || recvData.detail.result,
                                allPurchaseResults[recvData.detail.details] || recvData.detail.details,
                                subId,
                                recvData.detail.packages[subId]
                            );

                            if (recvData.detail.result == 'OK' && keySuccess == 0) {
                                keySuccess = 1;
                                $('.my-alipay').fadeIn();
                            }

                            break;
                        }
                    }
                } // packages.length != 0
                
            } // recvData.action == logOn
        };

        ws.onclose = () => {
            $('#panel_status').text(allTexts['text_server_disconnected']);

            $('.form-horizontal').fadeOut();
            //alert(allTexts['alert_server_disconnected']);
        };
    }

    function wsLogon() {

        let username = $('#inputUsername').val().trim();
        let password = $('#inputPassword').val().trim();
        let authcode = $('#inputCode').val().trim();
        
        if ( isBlank(username) || isBlank(password) ) {
            $('.panel-body').text(allTexts['test_input_incorrect']);
            return;
        }

        $('#buttonRedeem').fadeOut();
        $('.progress').fadeIn();
        $('.panel-body').text(allTexts['text_logging_on']);

        let data = JSON.stringify({
            action   : 'logOn',
            username : username,
            password : password,
            authcode : authcode
        });
        ws.send(data);
    }

    function wsRedeem() {

        let keys = getKeysByRE($('#inputKey').val().trim());
        if (keys.length <= 0) {return;}

        $('#buttonRedeem').fadeOut();
        $('.progress').fadeIn();
        $('#inputKey').attr('disabled', 'disabled');

        let data = JSON.stringify({
            action  : 'redeem',
            keys    : keys
        });

        console.log(data);
        keys.forEach( key => tableInsertKey(key) );

        ws.send(data);
    }

    function tableUpdateKey(key, result, detail, subId, subName) {
        let rowObjects = $('tr');
        for (let i=1; i<rowObjects.length; i++) {

            let rowElement = rowObjects[i];

            let rowObject = $(rowElement);
            if ( rowObject.children()[1].innerHTML.includes(key) && 
                    rowObject.children()[2].innerHTML.includes('激活中') ) {
                rowObject.children()[2].remove();

                // result
                if (result == '失败')
                    rowObject.append(`<td class="nobr" style="color:red">${result}</td>`);
                else
                    rowObject.append(`<td class="nobr" style="color:green">${result}</td>`);
                // detail
                rowObject.append(`<td class="nobr">${detail}</td>`);
                // sub
                if (subId == 0) {
                    rowObject.append('<td>——</td>');
                } else {
                    rowObject.append(`<td><code>${subId}</code> <a href="https://steamdb.info/sub/${subId}/" target="_blank">${subName}</a></td>`);
                }
            }
        }
    }

    function tableInsertKey(key) {

        keyCount++;
        let row = $('<tr></tr>');

        // number
        row.append(`<td class="nobr">${keyCount}</td>`);
        //key
        row.append(`<td class="nobr"><code>${key}</code></td>`);
        //waiting...
        row.append(`<td colspan="3">激活中，请稍候...</td>`);

        $('tbody').append(row);
    }

    function isBlank(str) {
        return str.trim() == '';
    }

    function getKeysByRE (text) {
        text = text.trim();
        let reg = new RegExp('([0-9,A-Z]{5}-){2}[0-9,A-Z]{5}', 'g');
        let keys = [];

        let result;
        while(result = reg.exec(text)) {
            keys.push(result[0]);
        }

        return keys;
    }

    $('#buttonRedeem').click( () => {
        if (loggedOn) {
            wsRedeem();
        } else {
            wsLogon();
        }
    });
    
})();
