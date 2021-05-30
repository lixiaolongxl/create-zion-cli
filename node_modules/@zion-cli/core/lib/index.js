'use strict';
module.exports = core;
const path = require('path')
const semver = require('semver')
const userHome = require("user-home")
const commander = require("commander");
const pathExists = require('path-exists').sync; 
const colors = require("colors/safe")
//require 加载。.js/.json /.node  其他的按js来解析
const {log,getnpmVersion,getsemverVersion} = require("@zion-cli/utils")
const init  = require("@zion-cli/exec")
// const init = require("@zion-cli/commands")
const pkg = require('../package.json')
const {nodeVersion,DEFAULT_CLI_HOME} = require('./const');
const program = new commander.Command();
let config;
function core(argv){
    prepare();
    reginsterCommand();
    
}
//检查版本
function checkVersion(){
    log.info('version',pkg.version)
}
//检查node版本
function chechNodeVersion(){
    let localNodeVersion = process.version;
    if(semver.gte(localNodeVersion,nodeVersion)){
        
    }else {
        log.error('Error',colors.red(`node.js版本不能小于${nodeVersion}`))
    }
}
//降级root
function checkRoot(){
    const rootCheck = require('root-check/index');
    rootCheck();
    // console.log(process.geteuid())
}
//检查用户的主目录
function checkUsetHome(){
    if(!userHome || !pathExists(userHome)){
        throw new Error(colors.red('当前用户主目录不存在'))
    }
    
}
//检查并解析参数debugger模式启用

function checkEnv(){
    const dotenv = require('dotenv')
    const dotenvPath = path.resolve(userHome,'.env');
    // log.verbose('env path',dotenvPath);
    if(pathExists(dotenvPath)){
        config = dotenv.config({
            path:dotenvPath
        })
    }
    createDefaultConfig();
    

    // log.verbose('环境变量',process.env.Cli_HOME_PATH);
    
}
//配置日志权限
function createDefaultConfig(){
    const cliConfig = {
        home:userHome
    }
    if(process.env.CLI_HOME){
        cliConfig['cliHome'] = path.join(userHome,process.env.CLI_HOME);
    }else {
        cliConfig['cliHome'] = path.join(userHome,DEFAULT_CLI_HOME);
    }
    process.env.Cli_HOME_PATH = cliConfig['cliHome']
}
//检查更新
async function cheacGlobalUpdate (){
    const currentVersion = pkg.version;
    const currentName = pkg.name;
    let data =  await getnpmVersion(currentName);
    let newVersion = getsemverVersion(currentVersion,data);

    if(newVersion&&newVersion.length>0){
        let lastversion = newVersion[0]
        if(lastversion&& semver.gt(lastversion,currentVersion)){
            log.warn(colors.yellow(`当前不是最新版本请手动更新，命令 npm i -g ${currentName}`))
        }
    }
    
}
//
async function prepare(){
    checkVersion();
    chechNodeVersion();
    checkRoot();
    checkUsetHome();
    checkEnv()
    cheacGlobalUpdate();
}
//命令注册
function reginsterCommand(){
    //注册脚手架
    program
        .name(Object.keys(pkg.bin)[0])
        .usage('<command> [options]')
        .version(pkg.version)
        .option('-d --debugger', '是否开启调试模式', false)
        .option('-tp --targetPath <targetPath>', '是否指定本地调试','');
        
        //开启debugger 模式

    // 注册命令
    program.command('init [projectName]')
    .option('-f, --force', '是否强制初始化项目')
    .action(init);

    program.on('option:debugger',()=>{
        const options = program.opts();
        if (options.debugger) {
            process.env.LOG_LEVEL = "verbose"
        }else {
            process.env.LOG_LEVEL = "info"
        }
        log.level = process.env.LOG_LEVEL;
    })
    program.on('option:targetPath',()=>{
        const options = program.opts();
        process.env.CLI_TARGET_PATH = options.targetPath;
        
    })
    program.on('command:*',(obj)=>{
        let commands = program.commands.map(cmd => cmd.name());
        log.error(colors.red('未知的命令' + obj[0]));
        log.info(colors.red('可用命令：' + commands.join(',')));
    })
    if(process.argv.length<3){
        program.outputHelp();
    }
    
    program.parse(process.argv);

    // function init(projectName,cmdObj){
    //     console.log(process.env.CLI_TARGET_PATH);
    // }
}