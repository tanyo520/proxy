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
            var socket = window.io.connect(this.getServerUrl());
            socket.on('connect', function() {
                console.log('successfully connected');
            });
            socket.on('connect_error', function(err) {
                console.log('failed to connect: ' + err);
            });
            socket.on('file:change', function(file) {
                console.log(file);
                try {
                    _this.reloadBrowser();
                } catch (err) {
                    console.error(err);
                }
            });
        },
        getServerUrl: function() {
            var url = this.doc.getElementById('__ds_socket__').src;
            var parser = this.parseUrl(url);
            return parser.protocol + '//' + parser.host;
        },
        reloadBrowser: function() {
            window.location.reload(true);
        },
        parseUrl: function(url) {
            var parser = this.doc.createElement('a');
            parser.href = url;
            return parser;
        }
    };
    __ds__.init();
})(window);
