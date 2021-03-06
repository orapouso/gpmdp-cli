const debug = require('debug')('gpmdp-cli:connect')
const cloneDeep = require('lodash.clonedeep')
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
      return this
    },

    start: function () {
      return this.checkToken()
        .then((token) => this.sendToken(token))
        .catch(() => {
          return this.requestConnection()
            .then(() => this.requestCode())
            .then((code) => this.sendCode(code))
            .then((token) => this.sendToken(token))
        })
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
        let proto = cloneDeep(conProtocol)
        proto.arguments.push(code)
        this.ws.send(proto)
      })
    },

    sendToken: function (token) {
      debug('sending token')
      return new Promise((res, rej) => {
        let proto = cloneDeep(conProtocol)
        let resolveTimeout = setTimeout(res, 1300)

        this.ws.once('connect', () => {
          debug('invalid token, start again')
          clearTimeout(resolveTimeout)
          rej(new Error('invalid_token'))
        })

        proto.arguments.push(token)
        this.ws.send(proto)
      })
    },

    checkPayload: function (msg, res, rej) {
      if (msg.payload === 'CODE_REQUIRED') {
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
