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

module.exports = {
  TOKEN_FILE: path.join(process.env.HOME, GPMDP_HOME, 'json_store/gpmdp_token.json'),
  connect: function (ws) {
    return new Promise((res) => {
      ws.on('connect', (msg) => {
        if (msg.payload === 'CODE_REQUIRED') {
          debug('CODE_REQUIRED')
          readline.createInterface({
            input: process.stdin,
            output: process.stdout
          }).question('Write down the 4 digit code: ', (code) => {
            debug('CODE:', code)
            conProtocol.arguments.push(code)
            ws.send(conProtocol)
          });
        } else {
          debug('TOKEN received', msg)
          fs.writeFileAsync(this.TOKEN_FILE, JSON.stringify({token: msg.payload}))
            .then(() => {
              conProtocol.arguments.splice(1, 1, msg.payload)
              ws.send(conProtocol)
              res()
            })
        }
      })

      fs.readFileAsync(this.TOKEN_FILE)
        .then((data) => {
          data = JSON.parse(data)
          debug('token found, sending to gpmdp', data)
          conProtocol.arguments.push(data.token)
          ws.send(conProtocol)
          res()
        })
        .catch((error) => { // no token
          debug('no token found, requesting connection', error)
          ws.send(conProtocol)
        })
    })
  }
}
