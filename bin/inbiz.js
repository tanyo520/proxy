#!/usr/bin/env node

const program = require('commander')
program.version('2.1.0')
  .usage('<command> [InBiz本地开发工具]')
  .command('p', '代理')
  .command('c', '将站点包里面扩展代码es6转es5并压缩处理')
  .parse(process.argv);



