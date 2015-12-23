import http from 'http';
import connect from 'connect';
import request from 'request';
import { expect } from 'chai';

import ProxyServer from '../../main/middleware/proxy';

let masterServer;
let firstServer;
let secondServer;

// Stert to listen
const origPort = 4410;
const firstPort = 4411;
const secondPort = 4412;

const serversWithMaster = {
  master: `http://localhost:${origPort}`,
  replica: [
    `http://localhost:${firstPort}`,
    `http://localhost:${secondPort}`
  ]
};

const serversOnlyReplicas = {
  replica: [
    `http://localhost:${firstPort}`,
    `http://localhost:${secondPort}`
  ]
};

const patterns = [
  { method: 'GET', path: /^\/my\.index\/my\.type/ },
  { method: 'GET', path: /^\/another\.index\/another\.type/ },
  { method: 'GET', path: /^\/nothing/ }
];

const contentTypeHtml = 'text/html; charset=utf-8';

describe('ProxyServer', () => {
  const destinationMasterResponseText = '\nDestination original!';
  const destinationFirstResponseText = '<html><body>destination first</body></html>';
  const destinationSecondResponseText = '<html><body>destination second</body></html>';
  const destinationSecondResponseText404 = '<html><body>404 destination second</body></html>';

  before(() => {
    // Create fake destination servers
    const destinationMaster = connect();
    destinationMaster.use((req, res, next) => {
      "use strict";
      res.setHeader('Content-Type', contentTypeHtml);
      res.writeHead(200);
      res.end(destinationMasterResponseText);
      next();
    });
    const destinationFirst = connect();
    destinationFirst.use((req, res, next) => {
      "use strict";
      res.setHeader('Content-Type', contentTypeHtml);
      res.writeHead(200);
      res.end(destinationFirstResponseText);
      next();
    });
    const destinationSecond = connect();
    destinationSecond.use((req, res, next) => {
      if (/^\/nothing/.test(req.url)) {
        res.writeHead(404, 'Content-Type: text/plain');
        res.end(destinationSecondResponseText404);
        next();
      }
      res.writeHead(200, 'Content-Type: text/plain');
      res.end(destinationSecondResponseText);
      next();
    });

    masterServer = http.createServer(destinationMaster).listen(origPort);
    firstServer =http.createServer(destinationFirst).listen(firstPort);
    secondServer = http.createServer(destinationSecond).listen(secondPort);
  });

  after(() => {
    masterServer.close();
    firstServer.close();
    secondServer.close();
  });

  it('should return the response from master server if servers has master', function(done) {
    "use strict";
    const proxyPort = 9999;
    const app = connect();
    app.use(ProxyServer.proxyRequest(serversWithMaster, patterns));
    const proxyServer = http.createServer(app);
    proxyServer.listen(proxyPort);

    request(`http://localhost:${proxyPort}/my.index/my.type`, (error, response, body) => {
      expect(error).not.to.exist;
      expect(response.statusCode).to.equal(200);
      expect(new RegExp(destinationMasterResponseText).test(body)).to.be.true;
      proxyServer.close();
      done();
    });
  });

  it('should return the response from replica if servers have only replicas', function(done) {
    "use strict";
    const proxyPort = 9999;
    const app = connect();
    app.use(ProxyServer.proxyRequest(serversOnlyReplicas, patterns));
    const proxyServer = http.createServer(app);
    proxyServer.listen(proxyPort);

    request(`http://localhost:${proxyPort}/my.index/my.type`, (error, response, body) => {
      expect(error).not.to.exist;
      expect(response.statusCode).to.equal(200);
      expect(response.headers['content-type']).to.equal(contentTypeHtml);
      const hasEither = new RegExp(destinationFirstResponseText).test(body)
        || new RegExp(destinationSecondResponseText).test(body);
      expect(hasEither).to.be.true;
      proxyServer.close();
      done();
    });
  });

  it('should return error response from proxy if servers have only replicas and they responded with different status codes', function(done) {
    "use strict";
    const proxyPort = 9999;
    const app = connect();
    app.use(ProxyServer.proxyRequest(serversOnlyReplicas, patterns));
    const proxyServer = http.createServer(app);
    proxyServer.listen(proxyPort);

    request(`http://localhost:${proxyPort}/nothing`, (error, response, body) => {
      expect(response.statusCode).to.equal(500);
      // Confirm that response body shows each responses from replicas
      expect(/200/.test(response.body)).to.be.true;
      expect(/404/.test(response.body)).to.be.true;
      proxyServer.close();
      done();
    });
  });
});

describe('Proxy#isMatchedPath', () => {

  it('should return true if matched path was given', function() {
    expect(ProxyServer.isMatchedPattern(
      [{ method: 'GET', path: /\/my\.index\/my\.type/ }],
      'GET',
      '/my.index/my.type'))
      .to.be.true;
    expect(ProxyServer.isMatchedPattern(
      [{ method: 'GET', path: /\/my\.index\/my\.type\/something/ }],
      'GET',
      '/my.index/my.type/something'))
      .to.be.true;
    expect(ProxyServer.isMatchedPattern(
      [{ method: 'GET', path: /\/another\.index\/another\.type/ }],
      'GET',
      '/another.index/another.type'))
      .to.be.true;
    expect(ProxyServer.isMatchedPattern(
      [{ method: 'GET', path: /\/another\.index\/another\.type\/something/ }],
      'GET',
      '/another.index/another.type/something'))
      .to.be.true;
  });

  it('should return false if not-matched path was given', function() {
    expect(ProxyServer.isMatchedPattern(
      [{ method: 'GET', path: /\/my\.index\/her\.type/ }],
      'GET',
      '/my.index/hertype'))
      .not.to.be.true;
    expect(ProxyServer.isMatchedPattern(
      [{ method: 'GET', path: /\/something$/ }],
      'GET',
      '/something/'))
      .not.to.be.true;
    expect(ProxyServer.isMatchedPattern(
      [{ method: 'GET', path: /\/another\.index\/another/ }],
      'GET',
      '/something/different'))
      .not.to.be.true;
  });
});
