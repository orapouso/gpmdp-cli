const EventEmitter = require('events')
const WebSocket = require('ws');
const debug = require('debug')('gpmdp:ws')

class WebSocketWrapper extends EventEmitter {
  constructor (url) {
    super()

    this.ws = new WebSocket(url)
    this.ws.on('open', () => {
      this.emit('open')
    })

    this.ws.on('message', (data) => {
      debug('message', data)
      let payload = JSON.parse(data)
      this.emit(payload.channel, payload)
    })
  }

  send () {
    if (typeof arguments[0] === 'object') {
      arguments[0] = JSON.stringify(arguments[0])
    }

    this.ws.send.apply(this.ws, arguments)
  }
}

module.exports = WebSocketWrapper
