var fs = require('fs');
var path = require('path');
var watch = require('node-watch');
var chalk = require('chalk');

function isObject(value) {
    var type = typeof value;
    return !!value && type === 'object';
};

function extend() {
    var i = 1;
    var target = arguments[0] || {};
    var len = arguments.length;
    var obj, keys, j;
    for (; i < len; i++) {
        obj = arguments[i];
        if (isObject(obj)) {
            keys = Object.keys(obj);
            j = keys.length;
            while (j--) {
                target[keys[j]] = obj[keys[j]];
            }
        }
    }
    return target;
}

function _logPrefix() {
    var now = new Date();
    var str = now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds();
    return '[' + chalk.cyan(str) + ']';
};

function log() {
    process.stdout.write(_logPrefix() + ' ');
    console.log.apply(console, arguments);
}

var defaluts = {
    path: 'public',
    match: /<body[^>]*>/i,
    filter: function(filename) {
        return !/node_modules/.test(filename);
    },
    delay: 1000,
    console: false
};

module.exports = function(opt) {
    var config = extend({}, defaluts, opt);
    if (!config.server) {
        console.log('you must config your server');
        return function(req, res, next) {
            next();
        };
    }
    var io = require('socket.io')(config.server);
    io.on('connection', function(socket) {
        log('Livereload client connected');
        if (config.console) {
            socket.on('console:log', function(args) {
                args.unshift(chalk.green('LOG'));
                log.apply(null, args);
            });
            socket.on('console:warn', function(args) {
                args.unshift(chalk.yellow('WARN'));
                log.apply(null, args);
            });
            socket.on('console:info', function(args) {
                args.unshift(chalk.cyan('INFO'));
                log.apply(null, args);
            });
            socket.on('console:error', function(args) {
                args.unshift(chalk.red('ERROR'));
                log.apply(null, args);
            });
        }
    });

    // 监听文件变化，reload
    var changedQueue = {};
    var boardcastChange = function(filename) {
        log('change: ' + chalk.yellow(filename));
        io.emit('file:change', {
            path: filename,
            name: path.basename(filename),
            ext: path.extname(filename).replace(/^\./, ''),
        });
        changedQueue[filename].stamp = Date.now();
    };
    watch(config.path,  { recursive: true },function(filename) {
        if (config.filter(filename)) {
            if (!changedQueue[filename]) {
                changedQueue[filename] = {};
                boardcastChange(filename);
            } else if (Date.now() - changedQueue[filename].stamp > config.delay) {
                boardcastChange(filename);
            } else {
                if (!changedQueue[filename].timer) {
                    setTimeout(function() {
                        boardcastChange(filename);
                    }, Date.now() - changedQueue[filename].stamp);
                    changedQueue[filename].timer = 1;
                }
            }
        }
    });
};
