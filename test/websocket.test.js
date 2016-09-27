const test = require('ava')
const EventEmitter = require('events')
const proxyquire = require('proxyquire')
const sinon = require('sinon')

class WebSocketMock extends EventEmitter {
  send () {}
}

const WebSocket = proxyquire('../src/websocket', {
  'ws': WebSocketMock
})

test('implements "on" and "emit"', t => {
  t.true('on' in WebSocket.prototype)
  t.true('emit' in WebSocket.prototype)
  t.true('send' in WebSocket.prototype)
})

test.cb('watch open event', (t) => {
  let ws = new WebSocket('valid_url')
  ws.on('open', () => {
    t.true(true)
    t.end()
  })

  ws.ws.emit('open')
})

test.cb('subscribe to gpmdp channels', (t) => {
  let ws = new WebSocket('valid_url')
  ws.on('connect', (msg) => {
    t.true(msg.payload === 'CODE_REQUIRED')
    t.end()
  })

  ws.ws.emit('message', JSON.stringify({
    channel: 'connect',
    payload: 'CODE_REQUIRED'
  }))
})

test('send with string', (t) => {
  let ws = new WebSocket('valid_url')
  sinon.stub(ws.ws, 'send')

  let str = 'valid_string'
  ws.send(str)
  t.true(ws.ws.send.called)
  t.true(ws.ws.send.calledWith(str))
  ws.ws.send.restore()
})

test('send with object', (t) => {
  let ws = new WebSocket('valid_url')
  sinon.stub(ws.ws, 'send')

  let obj = {valid: 'string'}
  ws.send(obj)
  t.true(ws.ws.send.called)
  t.true(ws.ws.send.calledWith(JSON.stringify(obj)))
  ws.ws.send.restore()
})
