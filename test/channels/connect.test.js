const test = require('ava')
const EventEmitter = require('events')
const Promise = require('bluebird')
const sinon = require('sinon')
const stdin = require('mock-stdin').stdin()
const fs = Promise.promisifyAll(require('fs'))
const connectChannel = require('../../src/channels/connect')
const protocol = require('../gpmdp-protocol.json')
const tempfile = require('tempfile')

class WebSocketMock extends EventEmitter {
  send () {
    return 1
  }
}

const FOUR_DIGIT_CODE = 'ABCD'

function mockTokenFile(tokenFile) {
  fs.writeFileSync(tokenFile, JSON.stringify({token: 'TEST_TOKEN'}))
}

test('check token without file', (t) => {
  let ws = new WebSocketMock()
  let channel = connectChannel({tokenFile: tempfile('.json')})
  t.throws(channel.connect(ws).then(channel.checkToken))
})

test('check token with file', (t) => {
  let channel = connectChannel({tokenFile: tempfile('.json')})
  mockTokenFile(channel.tokenFile)
  let ws = new WebSocketMock()

  return channel.connect(ws)
    .then(() => channel.checkToken())
    .then((token) => {
      t.true(token === 'TEST_TOKEN')
    })
})

test('request connection', (t) => {
  let ws = new WebSocketMock()
  let channel = connectChannel()
  sinon.stub(ws, 'send', () => {
    ws.emit('connect', protocol.connect.response_code_required)
  })

  return channel.connect(ws)
    .then(() => channel.requestConnection())
    .then(() => {
      t.true(ws.send.calledOnce)
      t.true(ws.send.calledWith(protocol.connect.request))
      ws.send.restore()
    })
})

test('request four digit code from user', (t) => {
  let ws = new WebSocketMock()
  let channel = connectChannel()

  let write = process.stdout.write
  process.stdout.write = ()=>{}
  setTimeout(() => stdin.send([FOUR_DIGIT_CODE, null]), 50)
  return channel.connect(ws)
    .then(() => channel.requestCode())
    .then((code) => {
      process.stdout.write = write
      t.true(FOUR_DIGIT_CODE === code)
    })
})
