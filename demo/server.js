var sendData=function(data,socket,keepString){
  data=data||{};
  socket.write(function(head){
    var heads=[];
    for(var what in head)
      heads.push('--'+what.charAt(0)+' '+head[what]);
    if(keepString!==undefined)heads.push('--r '+keepString);
    return heads.join('\n');
  }(data.header=data.header||{nodata:''}));
  if(!data.header.boundary)return;
  if(data.json||data.text){
    socket.write(data.text||JSON.stringify(data.json));
    socket.write(data.header.boundary+'--');
  }
};

require('SimpleWebsocket').create
({
  port:8100,
  timeout:{keepAlive:5000,firstShake:5000},
  onTextOK:function(text,head){
    console.log(text);
    sendData({
      header:{
        msg:'OK,'+text.length+' charactors received, `'+text+'`',
        nodata:''
      }
    },this.socket,head.keep||undefined);
  },
  onBinaryOK:function(data,head){
    console.log(data);
    sendData({
      header:{
        msg:'OK,'+data.length+' bytes received, `'+data+'`',
        nodata:''
      }
    },this.socket,head.keep||undefined);
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



