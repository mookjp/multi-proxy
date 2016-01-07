import connect from 'connect'
import fs from 'fs'
import path from 'path'
import http from 'http'
import request from 'request'
import { expect } from 'chai'

import multiProxy from '../../main/middleware/proxy'
import { defaultLogPath } from '../../main/lib/logger'

let masterServer
let firstServer
let secondServer
let notCalledServer

// Start to listen
const origPort = 4410
const firstPort = 4411
const secondPort = 4412
const notCalledPort = 4413

const serversWithMaster = {
  master: `http://localhost:${origPort}`,
  replica: [
    `http://localhost:${firstPort}`,
    `http://localhost:${secondPort}`
  ]
}

const serversWithNotCalled = {
  master: `http://localhost:${origPort}`,
  replica: [
    `http://localhost:${notCalledPort}`
  ]
}

const serversOnlyReplicas = {
  replica: [
    `http://localhost:${firstPort}`,
    `http://localhost:${secondPort}`
  ]
}

const patterns = [
  { method: 'GET', path: /^\/my\.index\/my\.type/ },
  { method: 'GET', path: /^\/another\.index\/another\.type/ },
  { method: 'GET', path: /^\/nothing/ },
  { method: 'GET', path: /^\/error-in-master/ }
]

const contentTypeHtml = 'text/html; charset=utf-8'

describe('ProxyServer', () => {
  const destinationMasterResponseText = '\nDestination original!'
  const destinationMasterResponseErrorText = 'Error in master!!'
  const destinationFirstResponseText = '<html><body>destination first</body></html>'
  const destinationSecondResponseText = '<html><body>destination second</body></html>'
  const destinationSecondResponseText404 = '<html><body>404 destination second</body></html>'

  before(() => {
    // Create fake destination servers
    const destinationMaster = connect()
    destinationMaster.use((req, res, next) => {
      if (/^\/error-in-master/.test(req.url)) {
        res.writeHead(503, 'Content-Type: text/plain')
        res.end(destinationMasterResponseErrorText)
        next()
      }
      res.setHeader('Content-Type', contentTypeHtml)
      res.writeHead(200)
      res.end(destinationMasterResponseText)
      next()
    })
    const destinationFirst = connect()
    destinationFirst.use((req, res, next) => {
      res.setHeader('Content-Type', contentTypeHtml)
      res.writeHead(200)
      res.end(destinationFirstResponseText)
      next()
    })
    const destinationSecond = connect()
    destinationSecond.use((req, res, next) => {
      if (/^\/nothing/.test(req.url)) {
        res.writeHead(404, 'Content-Type: text/plain')
        res.end(destinationSecondResponseText404)
        next()
      }
      res.writeHead(200, 'Content-Type: text/plain')
      res.end(destinationSecondResponseText)
      next()
    })
    const destinationShouldNotBeCalled = connect()
    destinationShouldNotBeCalled.use((req, res, next) => {
      throw new Error('Should not be called')
    })

    masterServer = http.createServer(destinationMaster).listen(origPort)
    firstServer = http.createServer(destinationFirst).listen(firstPort)
    secondServer = http.createServer(destinationSecond).listen(secondPort)
    notCalledServer = http.createServer(destinationShouldNotBeCalled).listen(notCalledPort)

    // create default log path
    try {
      fs.accessSync(path.dirname(defaultLogPath))
    } catch (e) {
      fs.mkdirSync(path.dirname(defaultLogPath))
    }
  })

  after(() => {
    masterServer.close()
    firstServer.close()
    secondServer.close()
    notCalledServer.close()

    // delete default log path
    fs.unlinkSync(defaultLogPath)
    fs.rmdirSync(path.dirname(defaultLogPath))
  })

  it('should return the response from master server if servers has master', function (done) {
    const proxyPort = 9999
    const app = connect()
    app.use(multiProxy(serversWithMaster, patterns))
    const proxyServer = http.createServer(app)
    proxyServer.listen(proxyPort)

    request(`http://localhost:${proxyPort}/my.index/my.type`, (error, response, body) => {
      expect(error).not.to.exist
      expect(response.statusCode).to.equal(200)
      expect(new RegExp(destinationMasterResponseText).test(body)).to.be.true
      proxyServer.close()
      done()
    })
  })

  it('should return the response from replica if servers have only replicas', function (done) {
    const proxyPort = 9999
    const app = connect()
    app.use(multiProxy(serversOnlyReplicas, patterns))
    const proxyServer = http.createServer(app)
    proxyServer.listen(proxyPort)

    request(`http://localhost:${proxyPort}/my.index/my.type`, (error, response, body) => {
      expect(error).not.to.exist
      expect(response.statusCode).to.equal(200)
      expect(response.headers['content-type']).to.equal(contentTypeHtml)
      const hasEither = new RegExp(destinationFirstResponseText).test(body) ||
        new RegExp(destinationSecondResponseText).test(body)
      expect(hasEither).to.be.true
      proxyServer.close()
      done()
    })
  })

  it('should return error response from proxy if servers have only replicas and they responded with different status codes', function (done) {
    const proxyPort = 9999
    const app = connect()
    app.use(multiProxy(serversOnlyReplicas, patterns))
    const proxyServer = http.createServer(app)
    proxyServer.listen(proxyPort)

    request(`http://localhost:${proxyPort}/nothing`, (error, response, body) => {
      expect(error).to.be.null
      expect(response.statusCode).to.equal(500)
      // Confirm that response body shows each responses from replicas
      expect(/200/.test(response.body)).to.be.true
      expect(/404/.test(response.body)).to.be.true
      proxyServer.close()
      done()
    })
  })

  it('should return error response from master and should not send requests to replicas if the master responded with error status code', function (done) {
    const proxyPort = 9999
    const app = connect()
    app.use(multiProxy(serversWithNotCalled, patterns))
    const proxyServer = http.createServer(app)
    proxyServer.listen(proxyPort)

    request(`http://localhost:${proxyPort}/error-in-master`, (error, response, body) => {
      expect(error).to.be.null
      expect(response.statusCode).to.equal(503)
      expect(new RegExp(destinationMasterResponseErrorText).test(response.body)).to.be.true
      proxyServer.close()
      done()
    })
  })

  it('should pass next callback if the method and path do not match', function (done) {
    const proxyPort = 9999
    const app = connect()
    app.use(multiProxy(serversOnlyReplicas, patterns))
    const proxyServer = http.createServer(app)
    proxyServer.listen(proxyPort)

    request(`http://localhost:${proxyPort}/does/not/match`, (error, response, body) => {
      expect(error).to.be.null
      expect(response.statusCode).to.equal(404)
      proxyServer.close()
      done()
    })
  })
})
