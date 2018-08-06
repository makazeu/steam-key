(() => {
    'use strict';

    let ws;
    let redeemRecordNum = 0;
    let successRecordNum = 0;

    let loggedIn = false;
    let unusedKeys = [];
    let inputStatus;

    const AutoDivideThreshold = 9;
    const RedeemTimeoutSeconds = 15;
    const AutoDivideWaitSeconds = 20;
    //const KeepAliveWaitSeconds = 20;
    const PingIntervalSeconds = 30;

    function init() {
        $('#modal-donate').find('[aria-label="Close"]').click(() => {
            $('#modal-donate').removeClass('active');
        });
        $('#modal-keys').find('[aria-label="Close"]').click(() => {
            $('#modal-keys').removeClass('active');
        });
        $('#modal-coupon').find('[aria-label="Close"]').click(() => {
            $('#modal-coupon').removeClass('active');
        });
        $('#button-login').click(() => {
            elementDisable('#input-username');
            elementDisable('#input-password');
            elementDisable('#input-authcode');
            $('#button-login').html('<span class="loading">登录Steam</span>');
            $('#toast-info').text(Texts.LOGGING_STEAM);
            doLoginSteam();
        });

        $('textarea').on('input', () => {
            let keys = searchKeyByRegExp($('textarea').val());
            $('#button-redeem').attr('data-badge', keys.length);
            if (keys.length > 0) {
                elementEnable('#button-redeem');
                inputStatus = InputStatus.KEY_INPUT;
            } else {
                elementDisable('#button-redeem');
                inputStatus = InputStatus.NONE_INPUT;
            }
        });

        $('#button-redeem').click(() => redeemKeys());

        $('#button-authcode').click(() => {
            submitAuthCode();
        });
    }

    function connectWs() {
        let protocol = location.protocol === 'https:' ? 'wss' : 'ws';
        ws = new WebSocket(`${protocol}://${location.host}/ws`);

        setServerStatus(ServerStatus.CONNECTING);

        let pingCount = 0;
        ws.onopen = () => {
            setInterval(() => wsSend({
                action: 'ping',
                count: ++pingCount,
            }), PingIntervalSeconds * 1000);
        };

        ws.onmessage = message => dispatchMessage(message);

        ws.onclose = () => {
            setServerStatus(ServerStatus.DISCONNECTED);
            elementDisable('#button-login');
            elementDisable('#button-redeem');
            inputStatus = InputStatus.NONE_INPUT;
        };
    }

    function dispatchMessage(message) {
        let data = parseJSON(message.data);
        if (!data.action) return;

        switch (data.action) {
            case 'pong':
                break;
            case 'connect':
                wsConnected(data);
                break;
            case 'authCode':
                requireAuthCode();
                break;
            case 'logOn':
                steamLogged(data);
                break;
            case 'redeem':
                receiveRedeemResult(data);
                break;
            default:
                break;
        }
    }

    function wsConnected(data) {
        $('#text-server-name').text(data.server);
        elementEnable('#button-login');
        setServerStatus(ServerStatus.CONNECTED);
        inputStatus = InputStatus.LOGIN_INPUT;
    }

    function doLoginSteam() {
        let username = $('#input-username').val().trim();
        let password = $('#input-password').val().trim();
        let authcode = $('#input-authcode').val().trim();
        if (isStrBlank(username) || isStrBlank(password)) {
            $('#toast-info').text(Texts.INPUT_INCORRECT);
            restoreInput();
            return;
        }

        inputStatus = InputStatus.NONE_INPUT;
        wsSend({
            action: 'logOn',
            username: username,
            password: password,
            authcode: authcode,
        });
    }

    function requireAuthCode() {
        inputStatus = InputStatus.AUTH_INPUT;
        $('#authcode-modal').addClass('active');
    }

    function submitAuthCode() {
        let authcode = $('#input-authcode-modal').val().trim();
        if (isStrBlank(authcode)) {
            return;
        }

        inputStatus = InputStatus.NONE_INPUT;
        wsSend({
            action: 'authCode',
            authCode: authcode,
        });
        $('#authcode-modal').removeClass('active');
    }

    function restoreInput() {
        elementEnable('#input-username');
        elementEnable('#input-password');
        elementEnable('#input-authcode');
        $('#button-login').html('<i class="icon icon-check"></i> 登录Steam');
    }

    function steamLogged(data) {
        restoreInput();
        if (data.result === 'success') {
            loggedIn = true;
            $('#userinfo-nickname').text(data.detail.name);
            $('#userinfo-location').text(data.detail.country);
            $('#toast-info-wrapper').fadeOut();
            elementOut('#form-login');
            elementIn('#form-redeem');
            inputStatus = InputStatus.KEY_INPUT;
        } else if (data.result === 'failed') {
            let errMsg = ErrorTexts[data.message] || data.message;
            $('#toast-info').text(Texts.LOGIN_FAILED + errMsg);
            inputStatus = InputStatus.LOGIN_INPUT;
        }
    }

    function receiveRedeemResult(data) {
        if (Object.keys(data.detail.packages).length === 0) {
            tableUpdateRedeemResult(data.detail.key,
                RedeemResults[data.detail.result] || data.detail.result,
                PurchaseResults[data.detail.detail] || data.detail.detail, 0, '');
        } else {
            for (let subId in data.detail.packages) {
                if (!data.detail.packages.hasOwnProperty(subId)) {
                    continue;
                }
                tableUpdateRedeemResult(data.detail.key,
                    RedeemResults[data.detail.result] || data.detail.result,
                    PurchaseResults[data.detail.detail] || data.detail.detail,
                    subId, data.detail.packages[subId]);
                break;
            }
        }
    }

    function updateUnusedKeys(key, result, detail, subId, subName) {
        let success = result === RedeemResults.OK;
        if (success && unusedKeys.includes(key)) {
            unusedKeys = unusedKeys.filter(item => item !== key);

            $('#list-keys li').forEach(listElement => {
                if (listElement.innerHTML.includes(key)) {
                    let listObject = $(listElement);
                    listObject.remove();
                }
            });
        } else if (!success && !unusedKeys.includes(key) && UnusedKeyReasons.includes(detail)) {
            $('#list-keys').append($('<li></li>')
                .html(`<span class="text-error">${key}</span> (${detail}` +
                    (subId !== 0 ? (': <code>' + subId + '</code> ' + subName) : '') + ')')
            );
            unusedKeys.push(key);
        }
    }

    function redeemKeys() {
        let keys = searchKeyByRegExp($('textarea').val());
        if (keys.length <= 0) {
            return;
        }
        elementDisable('#button-redeem');
        elementIn('#redeem-records');
        inputStatus = InputStatus.NONE_INPUT;

        let keyNum = 0;
        let keysToRedeem = [];

        keys.forEach(key => {
            keyNum++;
            if (keyNum <= AutoDivideThreshold) {
                insertTable(key, RedeemStatus.REDEEMING);
                keysToRedeem.push(key);
            } else {
                insertTable(key, RedeemStatus.WAITING);
            }
        });

        $('textarea').val('');
        $('#button-redeem').attr('data-badge', 0);
        scrollToId('redeem-records');

        tryRedeemKeys(keysToRedeem);
        if (keyNum > AutoDivideThreshold) {
            startRedeemTimer();
        }
    }

    function insertTable(key, status) {
        let num = ++redeemRecordNum;
        let id = `record-key-${num}`;
        let row = $(`<tr id="${id}"></tr>`);

        // row number
        row.append(`<td>${num}</td>`);
        // steam key
        row.append(`<td><span class="text-error">${key}</span></td>`);
        // status
        row.append(`<td>${status}</td>`);
        // sub info
        row.append(`<td></td>`);

        $('tbody').prepend(row);

        if (status === RedeemStatus.REDEEMING) {
            countRedeemTimeout(id);
        }
    }

    function tryRedeemKeys(keysToRedeem) {
        wsSend({
            action: 'redeem',
            keys: keysToRedeem
        });
    }

    function countRedeemTimeout(id) {
        setTimeout(() => {
            setRecordStatusInfo(id, RedeemStatus.TIMEOUT, Texts.REDEEMING_TIMEOUT);
        }, RedeemTimeoutSeconds * 1000);
    }

    function startRedeemTimer() {
        let timer = setInterval(() => {
            let hasMoreKeys = false;
            let keyNum = 0;
            let keysToRedeem = [];

            let rowObjects = $('#redeem-records tr');
            for (let i = 1; i < rowObjects.length; i++) {
                let row = $(rowObjects[i]);

                if (row.children()[2].innerHTML.includes(RedeemStatus.WAITING)) {
                    keyNum++;
                    if (keyNum <= AutoDivideThreshold) {
                        let key = row.children()[1].innerHTML;
                        key = key.substring(key.indexOf('>') + 1);
                        key = key.substring(0, key.indexOf('<'));

                        row.children()[2].innerHTML = RedeemStatus.REDEEMING;
                        countRedeemTimeout(row.attr('id'));
                        keysToRedeem.push(key);
                    } else {
                        hasMoreKeys = true;
                        break;
                    }
                }
            }

            if (!hasMoreKeys) {
                clearInterval(timer);
            }
            tryRedeemKeys(keysToRedeem);
        }, AutoDivideWaitSeconds * 1000);
    }

    function tableUpdateRedeemResult(key, result, detail, subId, subName) {
        updateUnusedKeys(key, result, detail, subId, subName);

        let rowObjects = $('#redeem-records tr');
        for (let i = rowObjects.length - 1; i >= 1; i--) {
            let row = $(rowObjects[i]);
            if (row.children()[1].innerHTML.includes(key) &&
                row.children()[2].innerHTML.includes(RedeemStatus.REDEEMING)) {
                row.children()[2].innerHTML = result;

                if (detail !== PurchaseResults.NoDetail) {
                    row.children()[3].innerHTML = detail;
                    if (subId !== 0) {
                        row.children()[3].innerHTML += '：';
                    }
                } else {
                    if (successRecordNum === 0) {
                        $('#toast-donate').fadeIn();
                    }
                    successRecordNum++;
                }
                if (subId !== 0) {
                    row.children()[3].innerHTML +=
                        `<span class="label label-warning label-rounded">${subId}</span> <a href="https://steamdb.info/sub/${subId}/" target="_blank">${subName}</a>`;
                }
                break;
            }
        }
    }

    function setRecordStatusInfo(id, status, info) {
        let rows = $(`#${id}`);
        if (rows.length === 0) {
            return;
        }
        if (rows.children()[2].innerHTML.includes(RedeemStatus.REDEEMING)) {
            rows.children()[2].remove();
            rows.children()[2].remove();
            rows.append(`<td>${status}</td>`);
            rows.append(`<td>${info}</td>`);
        }
    }

    function setServerStatus(status) {
        let serverStatusPrefix = 'server-status-';
        Object.keys(ServerStatus).forEach(status =>
            $('#' + serverStatusPrefix + ServerStatus[status]).hide()
        );
        $('#' + serverStatusPrefix + status).show();
    }

    function searchKeyByRegExp(text) {
        text = text.trim().toUpperCase();

        let keys = [];
        let regResult;

        while (regResult = KeyRegExp.exec(text)) {
            keys.push(regResult[0]);
        }
        return keys;
    }

    function checkWebSocket() {
        return 'WebSocket' in window;
    }

    function scrollToId(id) {
        let tag = $(`#${id}`);
        $('html,body').animate({
            scrollTop: tag.offset().top
        }, 'slow');
    }

    function wsSend(stuff) {
        try {
            let data = typeof stuff === 'string' ? stuff : JSON.stringify(stuff);
            ws.send(data);
        } catch (error) {
            // do nothing...
        }
    }

    function isStrBlank(str) {
        return str === null || (typeof str === 'string' && str.trim() === '');
    }

    function parseJSON(json, defaultValue = {}) {
        try {
            return JSON.parse(json);
        } catch (ex) {
            return defaultValue;
        }
    }

    function elementIn(ele) {
        $(ele).fadeIn();
    }

    function elementOut(ele) {
        $(ele).fadeOut();
    }

    function elementDisable(ele) {
        $(ele).attr('disabled', 'disabled');
    }

    function elementEnable(ele) {
        $(ele).removeAttr('disabled');
    }

    const ServerStatus = {
        CONNECTING: 'connecting',
        CONNECTED: 'connected',
        DISCONNECTED: 'disconnected',
    };

    const InputStatus = {
        LOGIN_INPUT: 'login',
        AUTH_INPUT: 'auth',
        KEY_INPUT: 'key',
        NONE_INPUT: 'none',
    };

    const RedeemStatus = {
        WAITING: '<span class="label label-warning">等待中</span>',
        REDEEMING: '<span class="label label-primary">激活中</span>',
        OK: '<span class="label label-success">成功</span>',
        FAILED: '<span class="label label-error">失败</span>',
        TIMEOUT: '<span class="label secondary">超时</span>',
    };

    const Texts = {
        BROWSER_NOT_SUPPORTED: '您的浏览器不受支持！',
        LOGGING_STEAM: '正在登录Steam，请稍候...',
        LOGIN_FAILED: '登录失败，原因：',
        INPUT_INCORRECT: '喵！请正确地输入信息！',
        REDEEMING_TIMEOUT: '激活超时，若未入库请重试',
    };

    const ErrorTexts = {
        'InvalidPassword': '错误的密码',
        'TwoFactorCodeMismatch': '安全令错误',
        'LimitedAccount': '受限用户暂无法使用',
        'AuthCodeError': '验证码有误',
        'RateLimitExceeded': '失败次数过多',
    };

    const PurchaseResults = {
        'NoDetail': '——',
        'AlreadyPurchased': '该游戏您已拥有',
        'DuplicateActivationCode': '激活码已被使用',
        'BadActivationCode': '无效激活码',
        'RateLimited': '已达到激活次数上限',
        'DoesNotOwnRequiredApp': '缺少DLC所需的主游戏',
        'RestrictedCountry': '无法在该区域激活',
    };

    const UnusedKeyReasons = [
        PurchaseResults.AlreadyPurchased,
        PurchaseResults.RateLimited,
        PurchaseResults.DoesNotOwnRequiredApp,
        PurchaseResults.RestrictedCountry,
    ];

    const RedeemResults = {
        'OK': RedeemStatus.OK,
        'Fail': RedeemStatus.FAILED,
    };

    const KeyRegExp = new RegExp('([0-9,A-Z]{5}-){2,4}[0-9,A-Z]{5}', 'g');

    if (!checkWebSocket()) {
        alert(Texts.BROWSER_NOT_SUPPORTED);
    }

    inputStatus = InputStatus.NONE_INPUT;
    $('body').bind('keypress', e => {
        let event = e || window.event;
        let code = event.keyCode || event.which || event.charCode;
        if (code === 13) {
            e.preventDefault();

            if (inputStatus === InputStatus.LOGIN_INPUT) {
                $('#button-login').click();
            } else if (inputStatus === InputStatus.AUTH_INPUT) {
                $('#button-authcode').click();
            } else if (inputStatus === InputStatus.KEY_INPUT) {
                $('#button-redeem').click();
            }
        }
    });

    init();
    connectWs();
})();