/*
 * websocket 服务器简易封装
 * http://www.rfc-editor.org/rfc/rfc6455.txt
 * code by treemonster@ 2015.2.15
 * Git: https://github.com/treemonster/websocket-server
 */
exports.create=function(option){

  const MASK_REQUIRED='客户端发送的数据帧必须使用掩码';
  const FORMAT_ERROR='发送的数据格式不正确';
  const BINARY_DISABLED='不允许发送二进制数据';
  const CLIENT_DISCONNECTED='客户端发出了断连请求';
  const UNKNOWN_ERROR='发生了未知错误';

  var id=0;
  /*
  settings 为参数及默认值
  */
  var settings={
    connect:{max:10,current:0}, //连接数:{最大,当前}
    timeout:{keepAlive:5000,firstShake:5000}, //超时:{心跳包,ws协议升级握手}
    port:8100, //端口号
    share:{}, //各连接实例共享变量
    dataMax:{text:2000,binary:2000*1000}, //一次消息允许发送的总数据长度不超过多少:{字符串:2000,二进制:2MB}
    allowBinary:false, //是否允许客户端发送二进制数据
    onConnect:function(){}, //新连接进入时触发
    onHeader:function(){}, //消息头部到达时触发
    onText:function(){}, //接收到客户端的消息分片（字符串）时触发消息
    onBinary:function(){}, //接收到客户端的消息分片（二进制）时触发消息
    onTextOK:function(){}, //消息分片完全到达时触发，参数为完整消息字符串
    onBinaryOK:function(){}, //消息分片完全到达时触发，参数为完整消息二进制数组
    onClose:function(){}, //客户端正常断开连接时触发
    onEnd:function(){}, //客户端断开连接时触发，如果是客户端正常断开连接，则onEnd会在onClose之后触发
    debug:true, //是否输出调试信息
    enableRule:{ //自定义规则，即websocket协议中未定义的规则
      text:{requireHead:false,joinMessage:false}, //文本消息是否需要:{头\尾部标记,消息的最后一个分片到达时需要触发onTextOK事件}
      binary:{requireHead:false,joinMessage:false} //二进制消息是否需要:{头\尾部标记,消息的最后一个分片到达时需要触发onBinaryOK事件}
    }
  };
  //把option里定义的参数替换settings里的默认参数
  test(settings,option);

  function is(a,b){
    return a !== undefined && a.constructor===b;
  }
  function test(a,b){
    for(var x in a)
      if(b.hasOwnProperty(x))
        if(is(a[x],Object))
          test(a[x],b[x]);
        else a[x]=b[x];
  }
  //创建数据帧
  function makeFrame(FIN,Opcode,data){
    var f=[],l=data.length;
    f.push((FIN<<7)|Opcode);
    if(l<126)f.push(l);
      else if(l<0xffff)f.push(126,l>>8,l&0xff);
        else f.push(127,0,0,0,0,
          (l>>24)&0xff,
          (l>>16)&0xff,
          (l>>8)&0xff,
           l&0xff);
    return Buffer.concat([new Buffer(f),data]);
  }
  //读取数据帧
  function readFrame(data,data_buffer,client){
    Array.prototype.push.apply(data_buffer,data);
    var e=data_buffer,buf=[],len=e.length,i,begin,opcode=e[0]&15;
    if(!(e[1]>>7)){return client.end(MASK_REQUIRED,1002);}
     switch(e[1]&127){
     case 126:
      payload_len=(e[2]<<8)+e[3];
      maskkey=e.slice(4,begin=8);
      break;
     case 127:
      payload_len=(e[6]<<24)+(e[7]<<16)+(e[8]<<8)+e[9];
      maskkey=e.slice(10,begin=14);
      break;
     default:
      payload_len=e[1]&127;
      maskkey=e.slice(2,begin=6);
      break;
   }
   if(payload_len>len-begin)return false;
   for(i=0;i<payload_len;i++)buf.push(e[i+begin]^maskkey[i%4]);
   data_buffer.splice(0,payload_len+begin);
   client.onReceived(new Buffer(buf),opcode);
   if(data_buffer.length>0)readFrame([],data_buffer,client);
  }
  //写入数据帧
  function writeTextFrame(text,io,client){
    var msg=Array.prototype.slice.call(new Buffer(text));
    var frag=200;//数据片段的长度
    var first=true;//是否第一个帧片段，如果是第一个片段，需要标明是1（文本）还是2（二进制）编码。如果不是，则填写0（延续帧）
    while(msg.length){
      var ms=msg.splice(0,frag);
      io.write(makeFrame(
        msg.length?0:1,
        first?1:0,
        new Buffer(ms)
      ));
      first=false;
    }
  }
  function log(msg){if(settings.debug)console.log(msg)}
  function checkData(data,isContinue,priv,datatype,callback){
  /*
  返回说明：
  0 拒绝请求，并断开连接
  1 成功
  2 收到的内容为消息头
  3 收到的内容为消息尾
  4 收到的内容为超短消息的消息头
  */
    var type=priv.type===1?'text':'binary';
    var rule=settings.enableRule[type];
    if(!isContinue)len=0;len+=data.length;
    if(len>settings.dataMax[type])return 0;
    if(!rule.requireHead)return 1;
    if(priv.STATUS===0){
      //需要头部，如果发送的不是头部，则拒绝请求
      if(!/^(\-\-.\s*( .+(\n|$))*)+$/.test(data))return 0;
      var ph={};
      data.split('\n').every(function(head){
        for(var type in this){
          if(!this[type].test(head))continue;
          ph[type]=head.replace(this[type],'$1');
        }
        return true;
      }.bind({
        //此处写需要处理的头部正则描述
        status:/^\-\-s (\d+)/,
        msg:/^\-\-m (.+)/,
        boundary:/^\-\-b (.+)/,
        nodata:/^\-\-n/
      }));
      //如果是0数据的消息, 那么消息头即可表示一个完整的消息, 返回成功标记
      if(ph.nodata!==undefined){
        priv.header=ph;
        return 4;
      }
      //如果发送的头部不带boundary，则拒绝请求
      if(!ph.boundary)return 0;
      priv.header=ph;
      priv.STATUS=1;
      return 2;
    }else if(priv.STATUS===1){
      if(rule.joinMessage){
        if(datatype==='text' && data===priv.header.boundary+'--'){
          callback(priv.data,priv.type);
        }else priv.data.push(data);
      }else{
        if(data!==priv.header.boundary+'--')return 1;
      }
      if(data===priv.header.boundary+'--'){
        for(var x in priv)delete priv[x];
        priv.STATUS=0;
        priv.data=[];
        priv.type=1;
        priv.header={};
        return 3;
      }
    }
    return 1;
  }

  var handler=function(io){
    var shaked=false;
    var self={id:++id,share:settings.share};
    var priv={STATUS:0,data:[],type:1,header:{}};
    var data_buffer=[];
    var type=1;
    var isEnd=false;
    var lastUpdate=new Date;
    var len=0;
    self.onReceived=function(e,opcode,isContinue){
      lastUpdate=new Date;
      switch(opcode){
      case 0:
        arguments.callee(e,type,true);
        break;
      case 1:
        type=1;
        var check=checkData(e.toString(),isContinue,priv,'text',function(data,type){
          if(type===1){
            settings.onTextOK.call(self,data.join(''),priv.header);
          }else{
            settings.onBinaryOK.call(self,Buffer.concat(data),priv.header);
          }
        });
        if(!check)return self.end(FORMAT_ERROR);
        if(check===1)settings.onText.call(self,e.toString(),isContinue);
        else if(check===2||check===4){
          settings.onHeader.call(self,priv.header,isContinue);
          priv.header={};
        }
        break;
      case 2:
        if(settings.allowBinary!==true)return self.end(BINARY_DISABLED);
        type=2;
        priv.type=2;
        var check=checkData(e,isContinue,priv,'binary');
        if(!check)return self.end(FORMAT_ERROR);
        if(check===1)settings.onBinary.call(self,e,isContinue);
        break;
      case 8:
        settings.onClose.call(self,e.toString().substr(2),
          e.readUInt16BE(0));
        self.end(CLIENT_DISCONNECTED);
        break;
      }
    };
    self.end=function(reason,code){
      if(isEnd)return;
      isEnd=true;
      var d=new Buffer('\0\0'+(reason||''));
      d.writeUInt16BE(code||1000,0);
      self.write(makeFrame(1,8,d));
      io.end();
      settings.connect.current--;
      settings.onEnd.call(self);
      log('Client #'+self.id+' exited `'+reason+'`');
      delete shaked;
      delete self;
      delete data_buffer;
      delete type;
      delete isEnd;
      delete lastUpdate;
      delete len;
    };
    self.write=function(data){
      if(isEnd)return;
      try{
        if(data.constructor===String)
          writeTextFrame(data,io,self);
        else if(data.constructor===Object)
          writeTextFrame(JSON.stringify(data),io,self);
        else io.write(data);
      }catch(e){}
    };
    io.on('error',function(){
      if(typeof self!=="undefined"){
        self.end(UNKNOWN_ERROR);
      }
      else{
        io.end();
        settings.onEnd.call(self);
      }
    });
    io.on('data',function(e){
      if(shaked){
        readFrame(e,data_buffer,self);
      }else{
        e.toString().replace(/Sec\-WebSocket\-Key\: (\S+)/,function(a,key){
          io.write([
            'HTTP/1.1 101 Switching Protocols',
            'Upgrade: websocket',
            'Connection: Upgrade',
            'Sec-WebSocket-Accept: '+require('crypto').createHash('sha1')
          .update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64')
          ].join('\r\n')+'\r\n\r\n');
        });
        shaked=true;
      }
    });
    settings.onConnect.call(self);
    log('Client: #'+id+' connected\n');
    settings.connect.current++;
    if(settings.connect.current>settings.connect.max)end();

    setTimeout(function(){
      if(!shaked)self.end();
      setTimeout(function(){
        if(new Date-lastUpdate>
          settings.timeout.keepAlive)
          self.end('Timeout');
        else setTimeout(arguments.callee,1000);
      },1000);
    },settings.timeout.firstShake);

  };
  require("net").createServer(handler).listen(settings.port);
};
