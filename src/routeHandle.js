var path = require("path");
var fs = require("fs");
const cheerio = require('cheerio');
const currentPath = path.resolve();
var watch = require('node-watch');
const remoteConfig = path.join(currentPath, ".inbiz", "remote.json");
const globaJsPath = path.join(currentPath, "wcm", "public", "index.js");
const globaCssPath = path.join(currentPath, "wcm", "public", "index.css");
const pageHtmlRex = /\$\(decodeURIComponent\(\'([\s\S]*)\'\)\)\[0\]/;
const globalRex = /globalExtend\/([A-Za-z0-9_-]*)\.js/;
const globalCssRex = /globalExtend\/([A-Za-z0-9_-]*)\.css/;
const pageContentRex = /pageContent\/([A-Za-z0-9_-]*)\/([A-Za-z0-9_-]*)\.js/;
const eformRex = /getextendcode[\s\S]*&formid=([A-Za-z0-9_]*)&/;
const plgModelRex = /pluginModel\/([A-Za-z0-9_-]*)\.js\?id=([A-Za-z0-9_-]*)&name=([A-Za-z0-9_-]*)/;
const pageRex = /pageExtend\/([A-Za-z0-9_-]*)\.js/;
const eformContextRex = /([\s\S]*\]\.publicCss)/;
const isPageRex = /page=true/;
const pageJsRex = /([\s\S]*globalExtend.page_onPreLoad\(\);)/;
const gloablTypeRex = /\/\*type\:1\*\//;
const fileByPathRex = /external\/eform\/upload\/fileresourcemanager\/([A-Za-z0-9_-]*)\/([A-Za-z0-9_-]*)\.js/;
const fileByUrlRex = /resourcefiles\/([A-Za-z0-9_-]*).([A-Za-z0-9]*)\?system_var_rootId=([A-Za-z0-9_-]*)/;
var config;
if (fs.existsSync(remoteConfig)) {
   console.log("初次缓存配置文件");
   config = JSON.parse(fs.readFileSync(remoteConfig, "utf-8").toString());
   watch(remoteConfig, function (evt, name) {
      if (evt == 'update') {
         // on create or modify
         config = JSON.parse(fs.readFileSync(remoteConfig, "utf-8").toString());
         console.log("更新配置文件");
      }
      if (evt == 'remove') {
         // on delete
      }

   });
} else {
   console.log(".inbiz下配置文件不存在！");
}


exports.handle = function (data, body) {
   switch (data.key) {
      case "global":
         body = handleGlobal(data, body);
         break;
      case "globalCss":
         body = handleGlobalCss();
         break;
      case "pageContent":
         body = handlePage(data, body);
         break;
      case "eform":
         body = handleEform(data, body);
         break;
      case "plgModel":
         body = handlePlgModel(data, body);
         break;
      case "isPage":
         body = handisPage(data, body);
         break;
      case "customPage":
         body = handCustomPageExtend(data, body);
         break;
      case "fileByPath":
         body = handleFileResourceByPath(data, body);
         break;
      case "fileByUrl":
         body = handleFileResourceByUrl(data, body);
         break;
   }
   return body;
}

function handleFileResourceByPath(data, body) {
   if(data.val){
      var resConfig = config.dev.res[data.val];
      if (resConfig && resConfig.path) {
         var pageJsPath = path.join(currentPath, resConfig.path);
         if(fs.existsSync(pageJsPath)){
            body = fs.readFileSync(pageJsPath);
         }else{
            console.log("本地未找到文件:"+data.val);
         }
      }else{
         console.log("未找到资源文件相关配置:"+data.val);
      }
   }
   else{
      console.log("文件id不能为空!");
   }
   return body;
}

function handleFileResourceByUrl(data, body) {
   if(data.val){
      var resConfig = config.dev.res[data.val];
      if (resConfig && resConfig.path) {
         var pageJsPath = path.join(currentPath, resConfig.path);
         if(fs.existsSync(pageJsPath)){
            body = fs.readFileSync(pageJsPath);
         }else{
            console.log("本地未找到文件:"+data.val);
         }
      }else{
         console.log("未找到资源文件相关配置:"+data.val);
      }
   }else{
      console.log("文件id不能为空!");
   }
   return body;
}

function handCustomPageExtend(data, body) {
   var pageConfig = config.wcm.pages[data.val];
   if (pageConfig && pageConfig.path) {
      var pageJsPath = path.join(currentPath, pageConfig.path, "index.js");
      if (fs.existsSync(pageJsPath)) {
         var jsStr = fs.readFileSync(pageJsPath, "utf-8");
         body = new Buffer(jsStr, "utf-8");
      }
   }
   return body;
}

function handisPage(data, body) {
   var pageContent = body.toString("utf-8");
   var snippet = '<script id="__ds_socket__" src="/socket.io.js"></script>';
   if (true) {
      snippet += '<script src="/__ds_livereload_console.js"></script>';
   } else {
      snippet += '<script async src="/__ds_livereload.js"></script>';
   }
   pageContent = pageContent.replace(/<body[^>]*>/i, function (w) {
      return w + snippet;
   });
   return new Buffer(pageContent, "utf-8");
}
function handleGlobal(data, body) {
   var code = fs.readFileSync(globaJsPath, "utf-8");
   var genCode = "";
   var trimCode = code.replace(/[\r\n]/g, "");
   if (trimCode.startsWith("define(")) {
      genCode = code;
   } else {
         genCode = `define(['jquery', 'logic/Portal', 'inbizsdk'], function($, portal, context){return {page_onLoad: function() {
            `+
            code
            +
            `
}}})`;
      }
   var body = new Buffer(genCode, "utf-8");
   return body;
}
function handleGlobalCss() {
   var code = fs.readFileSync(globaCssPath, "utf-8");
   var body = new Buffer(code, "utf-8");
   return body;
}
function handlePage(data, body) {
   var pageContent = body.toString("utf-8");
   var html = decodeURIComponent(pageHtmlRex.exec(pageContent)[1]);
   const $ = cheerio.load("<div id='handle'>" + html + "</div>");
   //自定义页面样式
   var $style = $("style[data-custom-style]").eq(0);
   if ($style && $style.length > 0) {
      var pid = $style.attr("data-custom-style");
      var pageConfig = config.wcm.pages[pid];
      if (pageConfig && pageConfig.path) {
         var pageCssPath = path.join(currentPath, pageConfig.path, "index.css");
         if (fs.existsSync(pageCssPath)) {
            $style.empty();
            var cssStr = fs.readFileSync(pageCssPath, "utf-8");
            $style.append(cssStr);
         }
      } else {
         console.log("配置文件没有找到:" + pid + "相关页面!");
      }
   }
   var views = $("div[data-custom-view]")
   //更新页面自定义插件视图
   if (views && views.length > 0) {
      for (var i = 0; i < views.length; i++) {
         var $view = $(views[0]);
         var viewId = $view.attr("data-custom-view");
         var key = viewId.split("|")[0];
         var plugin = config.wcm.plugins[key];
         if (plugin && plugin.path) {
            var plgViewPath = path.join(currentPath, plugin.path, "index.html");
            if (fs.existsSync(plgViewPath)) {
               $view.empty();
               var cViewStr = fs.readFileSync(plgViewPath, "utf-8");
               $view.append(cViewStr);
            }
         } else {
            console.log("配置文件没有找到:" + key + "相关插件!");
         }
      }
   }
   //更新自定义页面
   var $page = $("div[data-custom-page]").eq(0);
   var isCurtom = false;
   if ($page && $page.length > 0) {
      isCurtom = true;
      var pageId = $page.attr("data-custom-page");
      var pageConfig = config.wcm.pages[pageId];
      if (pageConfig && pageConfig.path) {
         var pageViewPath = path.join(currentPath, pageConfig.path, "index.html");
         if (fs.existsSync(pageViewPath)) {
            $page.empty();
            var cpageStr = fs.readFileSync(pageViewPath, "utf-8");
            $page.append($style);
            $page.append(cpageStr);
         }
      } else {
         console.log("配置文件没有找到:" + pageId + "相关页面!");
      }
   }
   var html = $("#handle").html();
   var pageHtml = pageContent.replace(pageHtmlRex, "$(decodeURIComponent(\"" + encodeURIComponent(html) + "\"))[0];\r\n");

   var pageCfg = config.wcm.pages[data.val];
   if (!isCurtom && pageCfg && pageCfg.path) {
      var pagejsPath = path.join(currentPath, pageCfg.path, "index.js");
      if (fs.existsSync(pagejsPath)) {
         if (pageJsRex.test(pageHtml)) {
            var paegeJS = fs.readFileSync(pagejsPath, "utf-8");
            if (paegeJS) {
               var temp = pageJsRex.exec(pageHtml)[1];
               temp += `;
                          ${paegeJS}
                        })
                     },
                     attached: function() {
                        require(['jquery', 'logic/Portal', 'inbizsdk'], function($, portal, context) {
                        })
                     },
                     compositionComplete: function() {
                        globalExtend.page_onLoad && globalExtend.page_onLoad();
                     }
                  }
               })
               `;
               pageHtml = temp;
            }
         }
      }
   }


   return new Buffer(pageHtml, "utf-8");
}
function handlePlgModel(data, body) {
   var plgConfig = config.wcm.plugins[data.val];
   if (plgConfig && plgConfig.path) {
      var plgJsPath = path.join(currentPath, plgConfig.path, "index.js");
      if (fs.existsSync(plgJsPath)) {
         var plgJsStr = fs.readFileSync(plgJsPath, "utf-8");
         body = new Buffer(plgJsStr, "utf-8");
      }
   } else {
      console.log("配置文件没有找到:" + data.val + "相关插件!");
   }
   return body
}
function handleEform(data, body) {
   var eformJSstr = body.toString("utf-8");
   var startStr = eformContextRex.exec(eformJSstr)[1];
   if (startStr) {
      var eformConfig = config.eform[data.val];
      if (eformConfig && eformConfig.path) {
         var eformCssPath = path.join(currentPath, eformConfig.path, data.val + ".css");
         var beforePath = path.join(currentPath, eformConfig.path, data.val + "_before.js");
         var afterPath = path.join(currentPath, eformConfig.path, data.val + "_after.js");
         var publicPath = path.join(currentPath, eformConfig.path, data.val + "_public.js");
         if (fs.existsSync(eformCssPath)) {
            var eformCssStr = fs.readFileSync(eformCssPath, "utf-8");
            startStr += "='" + eformCssStr.replace(/[\r\n]/g, "") + "';";
         }
         startStr += `
           window.instancesFormConfig["${data.val}"].publicExtend = function (eform,edoc2Form,formParser) {
            if(window.instancesFormConfig["${data.val}"].isDebug){debugger;}
         `
         if (fs.existsSync(publicPath)) {
            var publicJsStr = fs.readFileSync(publicPath, "utf-8");
            startStr += publicJsStr;
         }
         startStr += `
            };
            window.instancesFormConfig["${data.val}"].onLoadBefore = function (eform,edoc2Form,formParser) {
              if(window.instancesFormConfig["${data.val}"].isDebug){debugger;}
         `;
         if (fs.existsSync(beforePath)) {
            var beforeJsStr = fs.readFileSync(beforePath, "utf-8");
            startStr += beforeJsStr;
         }
         startStr += `
            };
            window.instancesFormConfig["${data.val}"].onLoaded = function(eform,edoc2Form,formParser) {
               if(window.instancesFormConfig["${data.val}"].isDebug){debugger;}
         `;
         if (fs.existsSync(afterPath)) {
            var afterJsStr = fs.readFileSync(afterPath, "utf-8");
            startStr += afterJsStr;
         }
         startStr += `
            };
          })(window);
        `;
         body = new Buffer(startStr, "utf-8");
      } else {
         console.log("配置文件没有找到:" + data.val + "相关表单!");
      }
   } else {
      console.log("表单:" + data.val + "解析错误!");
   }
   return body;
};
exports.getHandleKey = function (url) {
   var result = {};
   result.key = "";
   if (globalRex.test(url)) {
      result.key = "global";
      result.val = globalRex.exec(url)[1];
   }
   else if (globalCssRex.test(url)) {
      result.key = "globalCss";
      result.val = globalCssRex.exec(url)[1];
   }
   else if (pageContentRex.test(url)) {
      result.key = "pageContent";
      result.val = pageContentRex.exec(url)[1];
   }
   else if (plgModelRex.test(url)) {
      result.key = "plgModel";
      result.val = plgModelRex.exec(url)[3];
   }
   else if (eformRex.test(url)) {
      result.key = "eform";
      result.val = eformRex.exec(url)[1];
   }
   else if (isPageRex.test(url)) {
      result.key = "isPage";
   }
   else if (pageRex.test(url)) {
      result.key = "customPage";
      result.val = pageRex.exec(url)[1];
   }
   else if(fileByPathRex.test(url)){
      result.key = "fileByPath";
      result.val = fileByPathRex.exec(url)[2];
   }
   else if(fileByUrlRex.test(url)){
      result.key = "fileByUrl";
      result.val = fileByUrlRex.exec(url)[1];
   }
   return result;
}


