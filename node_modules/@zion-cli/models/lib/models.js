'use strict';
const {log} = require("@zion-cli/utils")
class Command{
    constructor(argv){
        if(!argv){
            throw new Error("参数不能为空")
        }
        this._argv = argv;

        let runner = new Promise((resolve,reject)=>{
            let chain = Promise.resolve();
            chain = chain.then(()=>{console.log('检查node 版本')});
            chain = chain.then(()=>this.initArgs())
            chain = chain.then(()=>this.init())
            chain = chain.then(()=>this.exec())
            chain.catch(err=>{
                log.error(err.message)
            })
        })
    }
    initArgs(){
        this._cmd = this._argv[this._argv.length-1]
        
        this._argv = Array.prototype.slice.call(this._argv);
        this._argv  = this._argv.slice(0,this._argv.length-1)
        
    }
    init(){
        throw new Error('init 必须实现')
    }
    exec(){
        throw new Error('exec 必须实现')
    }
}
module.exports = Command;