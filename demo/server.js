require('../SimpleWebsocket').create
({
  port:8100,
  timeout:{keepAlive:5000,firstShake:5000},
  onTextOK:function(text){
    console.log(text);
    this.write('OK,'+text.length+' charactors received, `'+text+'`');
  },
  onClose:function(reason,code){
    console.log(this.id);
  },
  debug:true,
  enableRule:{
    text:{
      requireHead:true,
      joinMessage:true
    }
  }
});



