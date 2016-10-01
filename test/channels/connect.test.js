const test = require('ava')
const cloneDeep = require('lodash.clonedeep')
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

let stdoutWrite = process.stdout.write

test.before(() => {
  process.stdout.write = ()=>{}
})

test.after(() => {
  process.stdout.write = stdoutWrite
})

const FOUR_DIGIT_CODE = 'ABCD'
const TEST_TOKEN = 'TEST_TOKEN'
const INVALID_TOKEN = 'INVALID_TOKEN'

function mockTokenFile(tokenFile) {
  fs.writeFileSync(tokenFile, JSON.stringify({token: TEST_TOKEN}))
}

test('check token without file', (t) => {
  let ws = new WebSocketMock()
  let channel = connectChannel({tokenFile: tempfile('.json')})
  t.throws(channel.connect(ws).checkToken())
})

test('check token with file', (t) => {
  let channel = connectChannel({tokenFile: tempfile('.json')})
  mockTokenFile(channel.tokenFile)
  let ws = new WebSocketMock()

  return channel.connect(ws)
    .checkToken()
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

  let expectedRequest = protocol.connect.request

  return channel.connect(ws)
    .requestConnection()
    .then(() => {
      t.true(ws.send.calledOnce)
      t.deepEqual(ws.send.args[0][0], expectedRequest)
      ws.send.restore()
    })
})

test('request four digit code from user', (t) => {
  let ws = new WebSocketMock()
  let channel = connectChannel()

  setTimeout(() => stdin.send([FOUR_DIGIT_CODE, null]), 50)
  return channel.connect(ws)
    .requestCode()
    .then((code) => {
      t.true(FOUR_DIGIT_CODE === code)
    })
})

test('send four digit code to gpmdp', (t) => {
  let ws = new WebSocketMock()
  let channel = connectChannel({tokenFile: tempfile('.json')})
  sinon.stub(ws, 'send', () => {
    ws.emit('connect', protocol.connect.response_token)
  })

  let expectedRequest = cloneDeep(protocol.connect.request)
  expectedRequest.arguments.push(FOUR_DIGIT_CODE)

  return channel.connect(ws)
    .sendCode(FOUR_DIGIT_CODE)
    .then((token) => {
      t.true(ws.send.calledOnce)
      t.deepEqual(ws.send.args[0][0], expectedRequest)
      t.true(token === protocol.connect.response_token.payload)
    })
    .then(() => {
      let data = fs.readFileSync(channel.tokenFile)
      let tokenData = JSON.parse(data)
      t.true(tokenData.token === protocol.connect.response_token.payload)
    })
})

test('send token to connect', (t) => {
  let ws = new WebSocketMock()
  let channel = connectChannel()
  sinon.stub(ws, 'send')

  let expectedRequest = cloneDeep(protocol.connect.request)
  expectedRequest.arguments.push(protocol.connect.response_token.payload)

  return channel.connect(ws)
    .sendToken(protocol.connect.response_token.payload)
    .then(() => {
      t.true(ws.send.calledOnce)
      t.deepEqual(ws.send.args[0][0], expectedRequest)
    })
})

test('send invalid token', (t) => {
  let ws = new WebSocketMock()
  let channel = connectChannel()
  sinon.stub(ws, 'send', (payload) => {
    if (payload.arguments[1] === INVALID_TOKEN) {
      ws.emit('connect', protocol.connect.response_code_required)
    }
  })

  t.throws(channel.connect(ws)
    .sendToken(INVALID_TOKEN))
})

test('error on write token file', (t) => {
  let ws = new WebSocketMock()
  let channel = connectChannel({tokenFile: '/var/log/no/permission/token.json'})
  sinon.stub(ws, 'send', () => {
    ws.emit('connect', protocol.connect.response_token)
  })

  t.throws(channel.connect(ws)
    .sendCode(FOUR_DIGIT_CODE))
})

test('start wrapper with token file', (t) => {
  let ws = new WebSocketMock()
  let channel = connectChannel({tokenFile: tempfile('.json')})
  mockTokenFile(channel.tokenFile)
  sinon.stub(ws, 'send')

  let expectedRequest = cloneDeep(protocol.connect.request)
  expectedRequest.arguments.push(protocol.connect.response_token.payload)

  channel.connect(ws)
    .start()
    .then(() => {
      t.true(ws.send.calledOnce)
      t.deepEqual(ws.send.args[0][0], expectedRequest)
    })
})

test('start with token file but invalid token', (t) => {
  let ws = new WebSocketMock()
  let channel = connectChannel({tokenFile: tempfile('.json')})
  mockTokenFile(channel.tokenFile)
  sinon.stub(ws, 'send', (payload) => {
    if (payload.arguments[1] === TEST_TOKEN) {
      ws.emit('connect', protocol.connect.response_code_required)
      setTimeout(() => stdin.send([FOUR_DIGIT_CODE, null]), 50)
    } else if (payload.arguments[1] === FOUR_DIGIT_CODE) {
      ws.emit('connect', protocol.connect.response_token)
    }
  })

  let expectedRequest = cloneDeep(protocol.connect.request)
  expectedRequest.arguments.push(protocol.connect.response_token.payload)

  channel.connect(ws)
    .start()
    .then(() => {
      t.true(ws.send.calledThrice)
    })
    .then(() => {
      let data = fs.readFileSync(channel.tokenFile)
      let tokenData = JSON.parse(data)
      t.true(tokenData.token === protocol.connect.response_token.payload)
    })
})

test('start wrapper without token file', (t) => {
  let ws = new WebSocketMock()
  let channel = connectChannel({tokenFile: tempfile('.json')})
  sinon.stub(ws, 'send', (payload) => {
    if (payload.arguments.length === 1) {
      ws.emit('connect', protocol.connect.response_code_required)
      setTimeout(() => stdin.send([FOUR_DIGIT_CODE, null]), 50)
    } else if (payload.arguments[1] === FOUR_DIGIT_CODE) {
      ws.emit('connect', protocol.connect.response_token)
    }
  })

  channel.connect(ws)
    .start()
    .then(() => {
      t.true(ws.send.calledThrice)
    })
    .then(() => {
      let data = fs.readFileSync(channel.tokenFile)
      let tokenData = JSON.parse(data)
      t.true(tokenData.token === protocol.connect.response_token.payload)
    })
})
