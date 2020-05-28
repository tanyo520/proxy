// include dependencies
const express = require('express');
const { handle, getHandleKey } = require('./routeHandle.js');
const { createProxyMiddleware } = require('http-proxy-middleware');
var path =require("path");
var reload = require('./index');
var fs =require("fs");

function start(){
  var settings={};
  var settingPath = path.join(path.resolve(),'inbiz.settings');
  if(fs.existsSync(settingPath)){
    try{
      var pjson =JSON.parse(fs.readFileSync(settingPath,"utf-8"));
      settings = pjson;
    }catch(e){
      console.log("inbiz.settings配置文件格式错误!");
    }
  }else{
      console.log("请您先拉取云端代码至本地!");
      return;
  }
  // proxy middleware options
  const options = {
    target: settings.ServerUrl, // target host
    changeOrigin: true, // needed for virtual hosted sites
    ws: true, // proxy websockets
    selfHandleResponse: true,
    // router: {
    //   // when request.headers.host == 'dev.localhost:3000',
    //   // override target 'http://www.example.org' to 'http://localhost:8000'
    //   'dev.localhost:3000': 'http://localhost:8000',
    // },
    onProxyRes: function (proxyRes, req, res) {
      var url = req.url;
      var result = getHandleKey(url);
      result.url=url;
      res.append('Access-Control-Allow-Origin', '*');
      res.append('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      var originalBody = new Buffer('');
      proxyRes.on('data', function (chunk) {
        originalBody = Buffer.concat([originalBody, chunk]);
      });
      proxyRes.on('end', function () {
        Object.keys(proxyRes.headers).forEach((key) => {
          if(key!="content-length"){
            res.append(key, proxyRes.headers[key]);
          }
        });
        originalBody = handle(result,originalBody);
        res.append("content-length",originalBody.length);
        res.write(originalBody);
        res.end();
      });
    }
  };

  // create the proxy (without context)
  const exampleProxy = createProxyMiddleware(options);

  // mount `exampleProxy` in web server
  const app = express();
  app.all('*', function(req, res, next) {
    res.set({
        'X-Frame-Options': 'DENY',
        'Cache-control': 'no-store',
        'Pragma': 'no-cache',
        'Strict-Transport-Security': 'max-age=' + (365 * 24 * 60 * 60) // 365 days, in seconds
    });
    next();
  });

  app.use(express.static(__dirname + '/lib'));
  var  server = app.listen(settings.Port);
  if(settings.Hot){
    var paths=[];
    var wcm = path.join(path.resolve(),'wcm');
    var eform = path.join(path.resolve(),'eform');
    var dev = path.join(path.resolve(),'dev');
    if(fs.existsSync(wcm)){
      paths.push(wcm);
    }
    if(fs.existsSync(eform)){
      paths.push(eform);
    }
    if(fs.existsSync(dev)){
      paths.push(dev);
    }
    if(paths.length==0){
     console.log("请先从云端获取代码到本地,本地没有找到wcm,eform,dev目录!");
     return;
    }
    reload({
      server: server,
      path: paths
    });
  }
  app.use('/', exampleProxy);
  console.log("代理服务开启成功！");
}

exports.start=start;