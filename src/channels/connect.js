const debug = require('debug')('gpmdp-cli:connect')
const readline = require('readline')
const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'))
const path = require('path')

const GPMDP_HOME = '.config/Google Play Music Desktop Player'

const conProtocol = {
  namespace: 'connect',
  method: 'connect',
  arguments: ['Google Play Music Desktop Player']
}

const TOKEN_FILE = path.join(process.env.HOME, GPMDP_HOME, 'json_store/gpmdp_token.json')

let ConnectChannel = function (options={}) {
  return {
    tokenFile: options.tokenFile || TOKEN_FILE,
    connect: function (ws) {
      this.ws = ws
      return Promise.resolve()
    },

    checkToken: function () {
      debug('check token')

      return fs.readFileAsync(this.tokenFile)
        .then((data) => {
          data = JSON.parse(data)
          debug('token found', data)
          return data.token
        })
    },

    requestConnection: function () {
      debug('requesting connection')

      return new Promise((res, rej) => {
        this.ws.once('connect', (msg) => this.checkPayload(msg, res, rej))
        this.ws.send(conProtocol)
      })
    },

    requestCode: function() {
      debug('requesting code')

      return new Promise((res) => {
        readline.createInterface({
          input: process.stdin,
          output: process.stdout
        }).question('Write down the 4 digit code: ', (code) => {
          debug('CODE:', code)
          res(code)
        });
      })
    },

    sendCode: function (code) {
      return new Promise((res, rej) => {
        this.ws.once('connect', (msg) => this.checkPayload(msg, res, rej))
        conProtocol.arguments.push(code)
        this.ws.send(conProtocol)
      })
    },

    sendToken: function (token) {
      debug('sending token')
      conProtocol.arguments.push(token)
      this.ws.send(conProtocol)
      return Promise.resolve()
    },

    checkPayload: function (msg, res, rej) {
      if (!msg || !('payload' in msg)) {
        rej(new Error('No payload in received msg'))
      } else if (msg.payload === 'CODE_REQUIRED') {
        debug('CODE_REQUIRED')
        res(msg)
      } else {
        debug('TOKEN received', msg)
        fs.writeFileAsync(this.tokenFile, JSON.stringify({token: msg.payload}))
          .then(() => res(msg.payload))
          .catch((err) => rej(err))
      }
    }
  }
}

module.exports = ConnectChannel
