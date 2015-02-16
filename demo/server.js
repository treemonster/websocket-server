require('SimpleWebsocket').create
({
  port:8100,
  timeout:{keepAlive:5000,firstShake:5000},
  onTextOK:function(text){
    console.log(text);
    this.write('OK,'+text.length+' charactors received, `'+text+'`');
  },
  onBinaryOK:function(data){
    console.log(data);
    this.write('OK,'+data.length+' bytes received, `'+data+'`');
  },
  onTextHeader:function(text){
    console.log(text);
  },
  onClose:function(reason,code){
    console.log(this.id);
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

