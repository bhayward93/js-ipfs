'use strict'

const exporter = require('ipfs-unixfs-engine').exporter
const promisify = require('promisify-es6')
const CID = require('cids')
const pull = require('pull-stream/pull')
const collect = require('pull-stream/sinks/collect')
const waterfall = require('async/waterfall')
const {
  validatePath,
  traverseTo
} = require('./utils')
const log = require('debug')('mfs:read')

const defaultOptions = {
  offset: 0,
  length: undefined
}

module.exports = function mfsRead (ipfs) {
  return promisify((path, options, callback) => {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }

    options = Object.assign({}, defaultOptions, options)

    try {
      path = validatePath(path)
    } catch (error) {
      return callback(error)
    }

    log(`Reading ${path}`)

    waterfall([
      (done) => traverseTo(ipfs, path, {
        parents: false
      }, done),
      (result, done) => {
        log('traversed to', result)

        pull(
          exporter(new CID(result.node.multihash), ipfs._ipld, {
            offset: options.offset,
            length: options.length
          }),
          collect((error, files) => {
            log(error, files)

            if (error) {
              return done(error)
            }

            pull(
              files[0].content,
              collect((error, data) => {
                log(error, data)

                if (error) {
                  return done(error)
                }

                done(null, Buffer.concat(data))
              })
            )
          })
        )
      }
    ], callback)
  })
}
