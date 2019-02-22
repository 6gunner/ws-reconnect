class HeartWs {
  constructor(url) {
    this.listeners = []; // 订阅的列表
    this.url = url;
    this._init();
  }

  _init() {
    this.ws = new WebSocket(this.url);
    this.ws.onmessage = (event) => {
      const {type, data} = event;
      if (type === 'message') {
        const jsonData = JSON.parse(data);
        if (jsonData.api === '') {
          // 处理业务逻辑
        } else if (jsonData.api === 'pong') {
          // 处理心跳
          this.lastHeart = jsonData.content;
        }
      }

    };
    this.ws.onopen = (event) => {
      console.log('ws连接成功');
      if (this.heartInterval) {
        clearTimeout(this.heartInterval);
      }
      if (this.checkInterval) {
        clearTimeout(this.checkInterval);
      }
      this.lastHeart = new Date().getTime();
      this.heartInterval = setInterval(this._sendHeart.bind(this), 5000);
      this.checkInterval = setInterval(this._checkConnect.bind(this), 5000);
      
      // listeners重新处理一遍;
      this.listeners.forEach(item => {
        if (!item.sended) {
          this.ws.send(JSON.stringify({
            id: item.id,
            api: 'quote.kline',
            topic: `${item.quote}.60`,
            type: 0
          }));
          // 深度
          this.ws.send(JSON.stringify({
            id: item.id,
            api: 'quote.depth',
            topic: `${item.quote}.0.10`,
            type: 0
          }));
          // 成交
          this.ws.send(JSON.stringify({
            id: item.id,
            api: 'quote.trade',
            topic: `${item.quote}`,
            type: 0
          }));
        }
      });
    }
    this.ws.onerror = (event) => {
      console.log('连接错误');
      const { type, target } = event;
      store.dispatch({
        type,
        target,
      })
    }
    this.ws.onclose = (event) => {
      console.log('连接断开');
      store.dispatch({
        type: CLOSE_WS,
      });
    }
  }

  _randomId() {
    let id = ++idCounter + '';
    return id;
  }

  // 业务逻辑，此处可以忽略。我这边处理的是订阅行情的业务。
  subscribeQuote({exchCode, symbolCode}) {
    // k线
    const id = this._randomId();
    let quoteItem = {
      id,
      quote: `${exchCode}.${symbolCode}`,
    };
    if (this.ws.readyState === 1) {
      this.ws.send(JSON.stringify({
        id,
        api: 'quote.kline',
        topic: `${exchCode}.${symbolCode}.60`,
        type: 0
      }));
      // 深度
      this.ws.send(JSON.stringify({
        id,
        api: 'quote.depth',
        topic: `${exchCode}.${symbolCode}.0.10`,
        type: 0
      }));
      // 成交
      this.ws.send(JSON.stringify({
        id,
        api: 'quote.detail',
        topic: `${exchCode}.${symbolCode}`,
        type: 0
      }));
      quoteItem.sended = true;
    } else {
      console.log('等待ws连接后，重新发送');
      quoteItem.sended = false;
    }
    this.listeners.push(quoteItem);
  }

  // 检查连接
  _checkConnect() {
    if ((new Date().getTime() - this.lastHeart) > 10000) {
      this.reconnect();
    }
  }

  // 发送心跳
  _sendHeart() {
    this.ws.send(JSON.stringify({
      api: 'getServerTime',
      type: 2,
    }));
  }

  close() {
    clearInterval(this.heartInterval);
    clearInterval(this.checkInterval);
    this.ws.close();
  }

  // 断开重连
  reconnect() {
    console.log('重新连接');
    this.ws.close();
    this._init();
  }
}

export default HeartWs;
