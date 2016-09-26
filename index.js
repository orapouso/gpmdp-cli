const WebSocket = require('./src/websocket');
const connectChannel = require('./src/channels/connect')
const debug = require('debug')('gpmdp-cli')

const ws = new WebSocket('ws://localhost:5672')

ws.on('open', () => {
  debug('socket connected')
  connectChannel.connect(ws)
    .then(() => debug('connected'))
});
