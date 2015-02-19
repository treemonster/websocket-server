require('../SimpleWebsocket').create
({
  port:8100,
  timeout:{keepAlive:5000,firstShake:5000},
  onTextOK:function(text){
    console.log(text);
    this.socket.write('OK,'+text.length+' charactors received, `'+text+'`');
  },
  onBinaryOK:function(data){
    console.log(data);
    this.socket.write('OK,'+data.length+' bytes received, `'+data+'`');
  },
  onTextHeader:function(text){
    console.log(text);
  },
  onClose:function(reason,code){
    console.log(this.socket.id);
  },
  debug:true,
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

