'use strict';
const path = require('path');
const fs = require('fs')
const userHome = require('user-home');
const inquirer = require('inquirer');
const semver = require('semver');
const fse = require('fs-extra')// 文件操作的库
const glob = require('glob'); //文件查询
const ejs = require('ejs');//模板渲染
const Command = require("@zion-cli/models")
const Package = require("@zion-cli/installpackage");
const {log,spinnerStart, sleep, execAsync} = require("@zion-cli/utils")

class IninCommand extends Command{
    init(){
        // 初始化数据
        this.projectName = this._argv[0]||'';
        this.force = this._cmd.opts().force || false;
        this.projectInfo = null;
        this.templateInfo = null;
        this.templateNpm = null
        this.templateList = [
            {
                name:'vue2标准模板',
                value:'zion-template-vue2',
                version:'latest'
            },
            {
                name:'vue3标准模板ts版',
                value:'zion-cli-vue3-ts',
                version:'latest'
            },
            {
                name:'vue库组件开发模板',
                value:'zion-cli-components',
                version:'latest'
            },
            {
                name:'uniapp app 项目开发模板',
                value:'zion-uniapp-template',
                version:'latest'
            }
        ] 
    }
    async exec(){
        
        try {
            //1准备模板信息
            let projectInfo =await this.prepare();
            log.verbose('项目配置信息',this.projectInfo);
            //2、下载模板
            await this.downloadTemplate();
            //3、安装模板
            await this.installTemplate();
        } catch (error) {
            log.verbose('出错了',error)
        }
        
    }
    async installTemplate(){
        log.verbose('templateInfo', this.templateInfo);
        if(this.templateInfo){
            // 标准安装
            await this.installNormalTemplate();
        }
    }
    async installNormalTemplate(){
        log.verbose('templateNpm', this.templateNpm);
        // 拷贝模板代码至当前目录
        let spinner = spinnerStart('正在安装模板...');
        await sleep();
        try {
            const templatePath = path.resolve(this.templateNpm.cacheFilePath, 'template');
            const targetPath = process.cwd();
            let proNamepath = path.resolve(targetPath,this.projectInfo.projectName)
            fse.mkdirpSync(proNamepath); //确保路径存在不存在创建
            fse.ensureDirSync(templatePath);
            fse.ensureDirSync(proNamepath);
            fse.copySync(templatePath, proNamepath); //拷贝模板
        } catch (error) {
            throw error;
        }finally{
            spinner.stop(true);
            log.success('模板安装成功');
        }
        //后面ejs 模板解析
        await this.ejsRender();
    }
    async ejsRender(){
        const dir = path.resolve(process.cwd(),this.projectInfo.projectName)
        const projectInfo = this.projectInfo;
         //console.log(projectInfo);
        return new Promise((resolve, reject)=>{
            glob('**',{
                cwd: dir,
                ignore:['**/node_modules/**','**/*.html'],
                nodir: true,
            },function(err,files){
                if(err){
                    reject(err)
                }
                Promise.all(files.map(file=>{
                    const filePath = path.join(dir, file);
                    return new Promise((resolve1, reject1)=>{
                        ejs.renderFile(filePath,projectInfo,{},(err, result)=>{
                            if(err){
                                reject1(err)
                            }else {
                                fse.writeFileSync(filePath, result);
                                resolve1(result);
                            }
                        })
                    })
                })).then(()=>{
                    resolve();
                }).catch(err=>{
                    reject(err)
                })
            })
        })
        
    }
    async prepare(){
        //判断当前目录是否为空
        let localPath = process.cwd();
        let project;
        if(this.force){
            //询问是否据需创建
            await this.isClearFs('确认清空当前文件，创建新项目?',()=>{
                fse.emptyDirSync(localPath);//清空当前文件加
                project = this.porjectInit()
            })
        }else {
            if(!this.isCwdEmpty(localPath)){
                await this.isClearFs('当前文件不为空，是否清空当前文件，继续创建项目？',()=>{
                    fse.emptyDirSync(localPath);//清空当前文件加

                    project = this.porjectInit()
                })
            }else {
                // 初始化项目信息
                project =  this.porjectInit()
               
            }
        }
        return project;
    }
    async porjectInit(){
        
        
        let _self = this;
        //获取项目基本信息
        let project;
        let inputInfo=[
            {
                name: 'projectVersion',
                type: 'input',
                message: '请输入项目版本',
                default: '1.0.0',
                validate: function(v) {
                    const done = this.async();
                    setTimeout(function() {
                      if (!(!!semver.valid(v))) {
                        done('请输入合法的版本号');
                        return;
                      }
                      done(null, true);
                    }, 0);
                  },
                filter: function(v) {
                    if (!!semver.valid(v)) {
                      return semver.valid(v);
                    } else {
                      return v;
                    }
                },
            },
            {
                type: 'list',
                name: 'projectTemplate',
                message: `请选择项目模板`,
                choices: this.createTemplateChoice(),
            } 
        ]
        if(!this.projectName){
            inputInfo.unshift({
                name: 'projectName',
                type: 'input',
                message: '请输入项目名称',
                default: 'project',
            })
        }
        project = await inquirer.prompt(inputInfo)
        if(!project.projectName) project.projectName = _self.projectName
        _self.projectInfo = project;
        return project;
    }
    //提醒用户是否确认清空当前文件
    async isClearFs(msg,cb){
        //询问是否据需创建
        let {ifContinue} =await inquirer.prompt([ {
            name: 'ifContinue',
            type: 'confirm',
            message: msg,
            default: false
        }])
        if(ifContinue){
            cb&&cb()
            //是否强制更新
        }else {
            return false;
        }
    }
    isCwdEmpty(localPath){
        //获取当前的文件目录
        log.verbose('当前文件目录',localPath)
        // log.verbose('当前文件目录',path.resolve('.'))
        let fileList = fs.readdirSync(localPath);
        fileList = fileList.filter(file=>{
            return !file.startsWith('.')&& ['mode_modules'].indexOf(file)<0
        })
        if(fileList.length>0){
            return false;
        }else {
            return true;
        }
    }
    //下载模板
    async downloadTemplate(){
       const {projectTemplate} = this.projectInfo
       const templateInfo = this.templateList.find(item => item.value === projectTemplate);
        //下载包到家目录下面
        const targetPath = path.resolve(userHome, '.zion-cli', 'template');
        const storeDir = path.resolve(userHome, '.zion-cli', 'template', 'node_modules');
        const { value, version } = templateInfo;
        this.templateInfo = templateInfo;
        const templateNpm = new Package({
            targetPath,
            storeDir,
            packageName: value,
            packageVersion: version,
        });
        
        if(!await templateNpm.exists()){ //不存在
            const spinner = spinnerStart('正在下载模板...');
            await sleep();
            try {
                await templateNpm.install()
            } catch (error) {
                throw(error)
            }finally{
                spinner.stop(true);
                if (await templateNpm.exists()) {
                    log.success('下载模板成功');
                    this.templateNpm = templateNpm;
                }
            }
        }else { //存在更新
            const spinner = spinnerStart('正在更新模板...');
            await sleep();
            try {
                await templateNpm.update();
            } catch (error) {
                throw(error)
            }finally{
                spinner.stop(true);
                if (await templateNpm.exists()) {
                    log.success('更新模板成功');
                    this.templateNpm = templateNpm;
                    // console.log(this.templateNpm.cacheFilePath)
                }
            }
        }
    }

    createTemplateChoice() {
        return this.templateList.map(item => ({
          value: item.value,
          name: item.name,
        }));
    }
}
function init() {
    // const cmdObj = arguments[arguments.length-1];
    return new IninCommand(arguments)
}
module.exports = init;
module.exports.IninCommand = IninCommand;