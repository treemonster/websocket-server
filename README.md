# websocket服务器简易封装
SimpleWebsocket.js 实现了一个 运行于nodejs环境的websocket服务器功能封装。
使用实例：
```javascript
require('./SimpleWebsocket').create
({
  port:8100, //端口号
  timeout:{keepAlive:5000,firstShake:5000}, //心跳包超时，连接握手超时
  onTextOK:function(text){ //消息分片全部到达时触发
    console.log(text);
    this.write('OK,'+text.length+' charactors received, `'+text+'`');
  },
  onClose:function(reason,code){ //客户端主动关闭连接时触发
    console.log(this.id);
  },
  debug:true, //debug为true时，simplewebsocket全部输出都会显示
  enableRule:{
    text:{
      requireHead:true, //是否必须包含消息头部
      joinMessage:true //是否等消息分片全部到达时把该消息的全部内容作为参数来处理，而不是每次处理消息片段
    }
  }
});
```
更多参数请参考SimpleWebsocket.js里的settings变量。
