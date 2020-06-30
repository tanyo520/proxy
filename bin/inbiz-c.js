var inquirer = require("inquirer");
var os = require('os');
var fs = require('fs');
var path = require('path');
const compressing = require('compressing');
var cssmin = require('cssmin');
var babel = require("@babel/core");
async function convertFile(input,output,type){
    if(fs.existsSync(input)){
        var name = path.basename(input,);
        var tmpPath=path.join(os.tmpdir(),name);
        var basePath=path.join(os.tmpdir(),name.replace(".zip",""));
        fs.copyFileSync(input,tmpPath);
        await compressing.zip.uncompress(tmpPath,basePath);
       var wcmPath = getFiles(path.join(basePath,"1.basic","wcm"),".json");
       var resPath= path.join(basePath,"2.resource","json","files.json");
       var resFilePath= path.join(basePath,"2.resource","file");
       var baseEformPath = path.join(basePath,"1.basic","eform");
       var eformPath = getFiles(baseEformPath,".edoc2sysdata");
       var ceformPath = eformPath.replace(".edoc2sysdata","");
       var wcmJson= JSON.parse(fs.readFileSync(wcmPath,"utf-8"));
       var presets=[];
       switch(type){
           case "0":
              presets.push("@babel/preset-env");
              presets.push("minify");
              break;
          case "1":
              presets.push("@babel/preset-env");
              break;
          case "2":
              presets.push("minify");
              break;
          default:
              presets.push("@babel/preset-env");
              presets.push("minify");
              break;
       }
       if(wcmJson){
           console.log("开始转换门户扩展代码！")
            //全局扩展代码压缩
            let result =  _min(wcmJson.WebSite.CssContent,wcmJson.WebSite.JavascriptContent,presets);
            wcmJson.WebSite.CssContent=result.css;
            wcmJson.WebSite.JavascriptContent=result.js;
            //站点页面
            wcmJson.SitePage.forEach(item => {
                let result =  _min(item.CssContent,item.JavascriptContent,presets);
                item.CssContent=result.css;
                item.JavascriptContent=result.js;
            });
            //自定义插件
            wcmJson.PluginCustom.forEach(item=>{
                let result =  _min("",item.ViewScript,presets);
                item.ViewScript=result.js;
            });
           let wcmJsonStr =  JSON.stringify(wcmJson);
           fs.writeFileSync(wcmPath,wcmJsonStr);
           console.log("----转换门户扩展代码已完成！-----")
       }
       await compressing.zip.uncompress(eformPath,ceformPath);
       var eformCfgPath=path.join(ceformPath,"SystemData.data");
       if(fs.existsSync(eformCfgPath)){
        console.log("----转换eform扩展代码开始！-----")
         var eformJson= JSON.parse(fs.readFileSync(eformCfgPath,"utf-8"));
         if(eformJson){
            eformJson[1].FormList.forEach(item => {
               let beforeJs = _eformMin("",item.OnLoadBefore,presets).js; 
               let loadedJs = _eformMin("",item.OnLoaded,presets).js; 
               let publicExtendJs = _eformMin("",item.PublicExtend,presets).js; 
               let publicCss = _eformMin(item.PublicCss,"",presets).css; 
               item.OnLoadBefore=beforeJs;
               item.OnLoaded=loadedJs;
               item.PublicExtend=publicExtendJs;
               item.PublicCss=publicCss;
            });
            let resultJsonStr = JSON.stringify(eformJson)
            fs.writeFileSync(eformCfgPath,resultJsonStr)
            fs.unlinkSync(eformPath);
            await compressing.zip.compressFile(eformCfgPath,eformPath)
            fs.unlinkSync(eformCfgPath);
            fs.rmdirSync(ceformPath);
            console.log("----转换eform扩展代码完成！-----")
         }
       }

       if(fs.existsSync(resPath)){
         let resConfig = JSON.parse(fs.readFileSync(resPath));
         resConfig.fileResourcesDetail.forEach(item=>{
            let ext=item.FileExtName.toLocaleLowerCase();
            if((ext==".js"||ext==".css") && item.FileName.indexOf(".min.")== -1){
                let filePath= path.join(resFilePath,item.FolderId,item.Id+item.FileExtName);
                if(fs.existsSync(filePath)){
                    if(ext==".css"){
                      let minCss = _eformMin(fs.readFileSync(filePath,"utf-8"),"",presets).css;
                      fs.writeFileSync(filePath,minCss);
                    }else if(ext==".js"){
                        let minjs = _eformMin("",fs.readFileSync(filePath,"utf-8"),presets).js;
                        fs.writeFileSync(filePath,minjs);
                    }
                }
            } 
         });
       }
       const zipStream = new compressing.zip.Stream();
       let files = fs.readdirSync(basePath);
       if(files){
        files.forEach(item=>{
            zipStream.addEntry(path.join(basePath,item));
        })
        zipStream
        .on('error', ()=>{ console.log("压缩错误")})
        .pipe(fs.createWriteStream(path.join(output,name)))
        .on('finish',function(){
            console.log("------------转换完成！-------------")
        })
        .on('error', ()=>{ console.log("压缩错误")});
       }
    }else{
        console.log("您输入的包地址不存在!");
    }
}

function _eformMin(css,js,presets){
    var rCss=css;
    var rJs="";
    if(css){
        if(presets.indexOf("minify")>-1){
        try{
          rCss = cssmin(css);
         }catch(e){
           console.log(e);
           rCss=css;
         }
       }
    }
    if(js){
        try{
            var transJs = babel.transformSync(js,{presets:presets});
            var jsMin = transJs.code;
            rJs = jsMin;
        }catch(e){
            console.log(e);
            rJs=js;
        }
    }
    return { css:rCss,js:rJs};
}
function _min(css,js,presets){
    var rCss=css;
    var rJs="";
    if(css){
        if(presets.indexOf("minify")>-1){
            try{
                rCss = Buffer.from(css,'base64').toString();
                rCss = cssmin(rCss);
                rCss= Buffer.from(rCss).toString('base64');
            }catch(e){
                console.log(e);
                rCss=css;
            }
        }
    }
    if(js){
        try{
            rJs = Buffer.from(js,'base64').toString();
            var transJs = babel.transformSync(rJs,{presets:presets});
            var jsMin = transJs.code;
            rJs = jsMin;
            rJs= Buffer.from(rJs).toString('base64');
        }catch(e){
            console.log(e);
            rjs=js;
        }
    }
    return { css:rCss,js:rJs};
}

function getFiles(url, ext) {
    var filePath="";
    if(fs.existsSync(url)){
        var files = fs.readdirSync(url);
        for(let i =0;i<files.length;i++){
           var et = path.extname(files[i]);
           if(et==ext){
             filePath= path.join(url,files[i]);
             break;
           }
        }
    }
    return filePath;
}

//convertFile("E:\\sss\\edrms20200608164636.zip","E:\\sss\\aaa",1);
inquirer.prompt([
    {
      name: 'i',
      message: '请输入需要转换的站点包路径!'
    },
    {
      name: 'o',
      message: '请输入转换后的站点包输出地址！'
    },
    {
        name: 't',
        message: '请选择处理类型(0:es6转es5并压缩;1:仅es6转es5;2:仅压缩;默认为0)！'
    }
  ]).then(answers => {
      try{
        convertFile(answers.i,answers.o,answers.t);
      }catch(e){
        console.log("转换异常",e);
      }
  })
  .catch(error => {
    console.log("请您重新选择！");
  });
 