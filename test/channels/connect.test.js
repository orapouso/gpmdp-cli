const test = require('ava')
const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'))
const connectChannel = require('../../src/channels/connect')

// backs up and removes token file
let haveTokenFile = false
const TOKEN_FILE = connectChannel.TOKEN_FILE
const BKP_TOKEN_FILE = TOKEN_FILE + '.bkp'

test.before(() => {
  return fs.readFileAsync(TOKEN_FILE)
    .then((data) => {
      haveTokenFile = true
      return fs.writeFileAsync(BKP_TOKEN_FILE, data)
    })
    .then(() => {
      return fs.unlinkAsync(TOKEN_FILE)
    })
    .catch(()=>{})
})

// restores backed up
test.after(() => {
  if (haveTokenFile) {
    return fs.readFileAsync(BKP_TOKEN_FILE)
      .then((data) => {
        return fs.writeFileAsync(TOKEN_FILE, data)
      })
      .then(() => {
        return fs.unlinkAsync(BKP_TOKEN_FILE)
      })
      .catch(()=>{})
  } else {
    return fs.unlinkAsync(TOKEN_FILE).catch(()=>{})
  }
})

test('no token file', (t) => {
  t.true(true)
})
