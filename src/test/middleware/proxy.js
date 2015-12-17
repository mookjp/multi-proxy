import http from 'http';
import connect from 'connect';
import request from 'request';
import { expect } from 'chai';

import ProxyServer from '../../main/middleware/proxy';

// Stert to listen
const origPort = 4410;
const firstPort = 4411;
const secondPort = 4412;

const servers = {
  // master should be a single endpoint
  master: `http://localhost:${origPort}`,

  // replica can have several endpoints
  replica: [
    `http://localhost:${firstPort}`,
    `http://localhost:${secondPort}`
  ]
};

const patterns = [
  /^\/my\.index\/my\.type/,
  /^\/another\.index\/another\.type/
];

describe('ProxyServer', () => {
  let origServer;
  let firstServer;
  let secondServer;

  const destinationOriginalResponseText = '\nDestination original!';
  const destinationFirstResponseText = '\nDestination first!';
  const destinationSecondResponseText = '\nDestination second!';

  before(() => {
    // Create fake destination servers
    let destinationOrig = connect();
    destinationOrig.use((req, res, next) => {
      "use strict";
      res.writeHead(200, 'Content-Type: text/plain');
      res.end(destinationOriginalResponseText);
      next();
    });
    let destinationFirst = connect();
    destinationFirst.use((req, res, next) => {
      "use strict";
      res.writeHead(200, 'Content-Type: text/plain');
      res.end(destinationFirstResponseText);
      next();
    });
    let destinationSecond = connect();
    destinationSecond.use((req, res, next) => {
      res.writeHead(200, 'Content-Type: text/plain');
      res.end(destinationSecondResponseText);
      next();
    });

    origServer = http.createServer(destinationOrig);
    origServer.listen(origPort);
    firstServer =http.createServer(destinationFirst);
    firstServer.listen(firstPort);
    secondServer = http.createServer(destinationSecond).listen(secondPort);
    secondServer.listen(secondPort);
  });

  let proxy;
  let app;
  beforeEach(() => {
    proxy = new ProxyServer(servers, patterns);
    app = connect();
  });

  after(() => {
    origServer.close();
    firstServer.close();
    secondServer.close();
  });

  it('should return the response from master server', function(done) {
    "use strict";

    const proxyPort = 9999;
    let app = connect();
    app.use((req, res, next) => {
      proxy.proxyRequest(req, res, next);
    });
    http.createServer(app).listen(proxyPort);

    request(`http://localhost:${proxyPort}/my.index/my.type`, (error, response, body) => {
      expect(error).not.to.exist;
      expect(response.statusCode).to.equal(200);
      expect(new RegExp(destinationOriginalResponseText).test(body)).to.be.true;
      done();
    });
  });
});

describe('Proxy#isMatchedPath', () => {
  const proxy = new ProxyServer(servers, patterns);

  it('should return true if matched path was given', function() {
    expect(proxy.isMatchedPath('/my.index/my.type')).to.be.true;
    expect(proxy.isMatchedPath('/my.index/my.type/something')).to.be.true;
    expect(proxy.isMatchedPath('/another.index/another.type')).to.be.true;
    expect(proxy.isMatchedPath('/another.index/another.type/something')).to.be.true;
  });

  it('should return false if not-matched path was given', function() {
    expect(proxy.isMatchedPath('/my.index/her.type')).not.to.be.true;
    expect(proxy.isMatchedPath('/something')).not.to.be.true;
    expect(proxy.isMatchedPath('/another.index/another/')).not.to.be.true;
  });
});
