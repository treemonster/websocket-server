var sendData=function(data,client,replyKeep){
  var msg=[];
  var socket=client.socket;
  client.keepList=client.keepList||{};
  socket.write=socket.write||socket.send;
  data.header=data.header||{};
  if(!data.json && !data.text){
    data.header.nodata=true;
  }
  msg.push(function(head){
    var heads=[];
    for(var what in head)
      heads.push('--'+what.charAt(0)+(head[what]===true?'':' '+head[what]));
    if(head.keep){
      client.keepList[head.keep]=data;
    }
    if(replyKeep!==undefined){
      heads.push('--r '+replyKeep);
      delete client.keepList[replyKeep];
    }
    return heads.join('\n');
  }(data.header));
  if(data.header.nodata!==true){
    if(!data.header.boundary)throw new error('错误的格式');
    if(data.json||data.text){
      msg.push(data.text||JSON.stringify(data.json));
      msg.push(data.header.boundary+'--');
    }
  }
  while(msg.length)socket.write(msg.shift());
};

require('../SimpleWebsocket').create
({
  port:8100,
  timeout:{keepAlive:5000,firstShake:5000},
  onTextOK:function(text,head){
    console.log(text);
    sendData({
      header:{
        msg:'OK,'+text.length+' charactors received, `'+text+'`'
      }
    },this,head.keep);
  },
  onBinaryOK:function(data,head){
    console.log(data);
    sendData({
      header:{
        msg:'OK,'+data.length+' bytes received, `'+data+'`'
      }
    },this,head.keep);
  },
  onHeader:function(text){
    console.log(text);
  },
  onClose:function(reason,code){
    console.log(this.id);
  },
  allowBinary:true,
  enableRule:{
    text:{
      requireHead:true,
      joinMessage:true
    },
    binary:{
      requireHead:true,
      joinMessage:true
    }
  }
});



