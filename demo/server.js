require('../SimpleWebsocket').create
({
  port:8100,
  timeout:{keepAlive:5000,firstShake:5000},
  onTextOK:function(text){
    console.log(text);
    this.socket.write('--b testboundary');
    this.socket.write('OK,'+text.length+' charactors received, `'+text+'`');
    this.socket.write('testboundary--');
  },
  onBinaryOK:function(data){
    console.log(data);
    this.socket.write('--b testboundary');
    this.socket.write('OK,'+data.length+' bytes received, `'+data+'`');
    this.socket.write('testboundary--');
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

