let idCounter = 0;
class QuoteWs {
  constructor(url) {
    this.quoteLists = []; // 订阅的行情列表
    this.url = url;
    this.forceClose = false;
    this._init();
  }

  _init() {
    this.ws = new WebSocket(this.url);
    this.ws.onmessage = (event) => {
      const {type, data} = event;
      if (type === 'message') {
        const jsonData = JSON.parse(data);
        if (jsonData.api === 'quote.kline' && jsonData.ts) {
         // 处理业务逻辑  
        }
      }
    };
    this.ws.onopen = (event) => {
      console.log('ws连接成功');
      store.dispatch({
        type: OPEN_WS,
      })
      // quoteList重新获取一遍;
      this.quoteLists.forEach(item => {
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
      // 触发自定义事件
    }
    this.ws.onclose = (event) => {
      console.log('连接断开');
      if (!this.forceClose) {
        setTimeout(() => {
          this.reconnect();
        }, 5000); // 隔一定时间进行重连，避免一直疯狂重连
      }
      // 触发自定义事件
      this.forceClose = false; // 还原forceClose属性；
    }
  }

  _randomId() {
    let id = ++idCounter + '';
    return id;
  }

  // 订阅
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
    this.quoteLists.push(quoteItem);
  }

  close(code, reason) {
    if (!code) {
      code = 1000;
    }
    this.forceClose = true;
    if (this.ws) {
      this.ws.close(code, reason);
    }
  }

  // 断开重连
  reconnect() {
    console.log('重新连接');
    this._init();
  }
}

export default QuoteWs;
