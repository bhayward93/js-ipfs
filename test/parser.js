/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const APIctl = require('ipfs-api')
const http = require('http')
const fs = require('fs')
const IPFSMultipart = require('..')

describe('parser', () => {
  const PORT = 6001

  let ctl
  let handler = (req, cb) => cb()

  before((done) => {
    http.createServer((req, res) => {
      if (req.method === 'POST' && req.headers['content-type']) {
        return handler(req, () => {
          res.writeHead(200)
          res.end()
        })
      }

      res.writeHead(404)
      res.end()
    }).listen(PORT, () => {
      ctl = APIctl('/ip4/127.0.0.1/tcp/6001')
      done()
    })
  })

  it('parses ctl.config.replace correctly', (done) => {
    const filePath = 'test/fixtures/config'
    const fileContent = fs.readFileSync(filePath, 'utf8')
    const files = []

    handler = (req, cb) => {
      expect(req.headers['content-type']).to.be.a('string')
      const parser = IPFSMultipart.reqParser(req)

      parser.on('file', (fileName, fileStream) => {
        const file = { fileName: fileName, content: '' }
        fileStream.on('data', (data) => {
          file.content = data.toString()
        })
        fileStream.on('end', (data) => {
          files.push(file)
        })
      })

      parser.on('end', () => {
        expect(files.length).to.equal(1)
        expect(files[0].fileName).to.equal('config')
        expect(files[0].content).to.equal(fileContent)
        cb()
      })
    }

    ctl.config.replace(filePath, (err, res) => {
      expect(err).not.to.exist
      done()
    })
  })
})
