const EventEmitter = require('events')
const WebSocket = require('ws');
const debug = require('debug')('gpmdp-cli:ws')

class WebSocketWrapper extends EventEmitter {
  constructor (url) {
    super()

    this.ws = new WebSocket(url)
    this.ws.on('open', () => {
      this.emit('open')
    })

    this.ws.on('message', (data) => {
      let payload = JSON.parse(data)
      debug('message', payload.channel)
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
