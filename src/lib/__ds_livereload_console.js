(function(window) {
    'use strict';
    var options = {
        tagNames: {
            'css': 'link',
            'js': 'script'
        },
        attrs: {
            'link': 'href',
            'script': 'src'
        }
    };
    var __ds__ = window.__ds__ = {
        doc: window.document,
        init: function() {
            var _this = this;
            var socket = window.io.connect();
            socket.on('connect', function() {
                console.log('successfully connected');
            });
            socket.on('connect_error', function(err) {
                console.log('failed to connect: ' + err);
            });
            socket.on('file:change', function(file) {
                try {
                    console.log(file);
                    _this.reloadBrowser();
                } catch (err) {
                    console.error(err);
                }
            });
        },
        reloadBrowser: function() {
            window.location.reload(true);
        }
    };
    __ds__.init();

    var socket = __ds__.socket;
    // 保存原始的console
    var __console = window.console;
    var console = window.console;
    var methods = ['info', 'log', 'error', 'warn'];
    var slice = Array.prototype.slice;
    var i = 0;
    if (!socket) {
        return;
    }
    for (; i < methods.length; i++) {
        console[methods[i]] = (function(func, method) {
            return function() {
                var args = slice.call(arguments);
                try {
                    socket.emit('console:' + method, args);
                } catch (e) {
                    console.error(e);
                }
                func.apply(console, args);
            };
        })(console[methods[i]], methods[i]);
    }
    // 捕获错误信息
    window.onerror = function (message, filename, lineno, colno, error) {
        console.error(message, filename + ':' + lineno);
    };
    window.console = console;
    window.__console = __console;
})(window);
