const WebSocket = require('./websocket');
const connect = require('./channels/connect')
const debug = require('debug')('gpmdp-cli')

const ws = new WebSocket('ws://localhost:5672')

ws.on('open', () => {
  debug('socket connected')
  connect(ws)
});
