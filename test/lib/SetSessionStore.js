"use strict";

class MemoryStore{
  constructor(){
    this.sessions = {};
    this.timeouts = {};
  }

  load(sid){
    return this.sessions[sid];
  }

  save(sid, val){
    this.sessions[sid] = val;
  }

  get(sid){
    return this.sessions[sid];
  }

  set(sid, val, ttl){
    if(sid in this.timeouts){clearTimeout(this.timeouts[sid]);}

    this.sessions[sid] = val;
    // this.timeouts[sid] = setTimeout(() => {
    //   delete this.sessions[sid];
    //   delete this.timeouts[sid];
    // }, ttl);
  }

  remove(sid){
    if(sid in this.timeouts){
      clearTimeout(this.timeouts[sid]);

      delete this.sessions[sid];
    }
    delete this.sessions[sid];
  }

  destroy(sid){
    if(sid in this.timeouts){
      clearTimeout(this.timeouts[sid]);
      delete this.timeouts[sid];
    }
    delete this.sessions[sid];
  }
}

function getSessId(cookieStr){
  if(cookieStr){
    const tmp = cookieStr.split(';');
    for(let i in tmp){
      if(tmp[i].startsWith('SESSIONID={"_sid":')){
        let ret = tmp[i].replace('SESSIONID={"_sid":"', '');
        ret = ret.substring(0, ret.length - 2);
        return ret;
      }
    }
    return null;
  }
}

module.exports = function(options){
  let sessionStore = new MemoryStore();
  return async function(ctx, next){
    ctx.sessionStore = ctx.sessionStore || sessionStore;
    await next();
  };
};

module.exports.MemoryStore = MemoryStore;

module.exports.setSessionId = function(options){
  return async function(ctx, next){
    ctx.sessionId = getSessId(ctx.header.cookie);
    const cookies = ctx.header.cookie;
    await next();
  };
};
