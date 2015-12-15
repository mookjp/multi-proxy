import http from 'http';
import { expect } from 'chai';
import httpProxy from 'http-proxy';
import Promise from 'bluebird';

import Forwarder from '../../main/lib/forwarder';

describe('Forwarder', () => {
  "use strict";

  const mockServerHost = '127.0.0.1';
  const mockServerPort = 12012;
  const mockServer200Port = 12013;
  const mockServer404Port = 12014;

  let mockServer;
  let mockServerReturns200;
  let mockServerRerurns404;

  before(() => {
    mockServer = http.createServer((req, res) => {
      // TODO: Write response body as a json
      if (req.url === '/resolve') {
        res.writeHead(200, {'Content-Type': 'text/plain'});
      }
      if (req.url === '/reject') {
        res.writeHead(500, {'Content-Type': 'text/plain'});
      }

      let body = '';
      req.on('data', chunk => {
        body += chunk;
      });
      res.end(`Got your request: ${body}`);
    }).listen(mockServerPort, mockServerHost);

    mockServerReturns200 = http.createServer((req, res) => {
      // TODO: Write response body as a json
      res.writeHead(200, {'Content-Type': 'text/plain'});
      let body = '';
      req.on('data', chunk => {
        body += chunk;
      });
      res.end(`Got your request: ${body} ; And I return 200!!`);
    }).listen(mockServer200Port, mockServerHost);

    mockServerRerurns404 = http.createServer((req, res) => {
      // TODO: Write response body as a json
      res.writeHead(404, {'Content-Type': 'text/plain'});
      let body = '';
      req.on('data', chunk => {
        body += chunk;
      });
      res.end(`Got your request: ${body} ; But I return 404!!`);
    }).listen(mockServer404Port, mockServerHost);
  });

  after(() => {
    mockServer.close();
    mockServerReturns200.close();
    mockServerRerurns404.close();
  });

  describe('Forwarder#sendRequest', () => {

    it('should return resolve if response has 2XX response', function(done) {
      const request = {
        protocol: 'http',
        host: mockServerHost,
        port: mockServerPort,
        url: '/resolve',
        method: 'GET',
        headers: {
          "Content-Type": "text/plain"
        },
        body: 'this is body to resolving path'
      };

      Forwarder.sendRequest(request)
        .then((data) => {
          expect(data).not.to.be.null;
          expect(data.statusCode).to.equal(200);
          done();
        })
        .catch((error) => {
          throw new Error('This test case failed as Promise was rejected: ' + error);
        });
    });

    // TODO: reject or return normal response from origin server?
    it('should return resolve with 500 if response has 5XX response', function(done) {
      const request = {
        protocol: 'http',
        host: mockServerHost,
        port: mockServerPort,
        url: '/reject',
        method: 'GET',
        headers: {
          "Content-Type": "text/plain"
        },
        body: 'this is body to rejecting path'
      };

      Forwarder.sendRequest(request)
        .then((data) => {
          expect(data).not.to.be.null;
          expect(data.statusCode).to.equal(500);
          done();
        })
        .catch((error) => {
          throw new Error('This test case failed as Promise was rejected: ' + error);
        });
    });
  });

  describe('Forwarder#createSendRequest', () => {
    const servers = [
      `http://${mockServerHost}:${mockServer200Port}`,
      `http://${mockServerHost}:${mockServer404Port}`
    ];

    const request = {
      protocol: 'http',
      host: mockServerHost,
      port: mockServerPort,
      url: '/',
      method: 'GET',
      headers: {
        "Content-Type": "text/plain"
      },
      body: 'this is body to two servers!'
    };

    // TODO: This could be covered in 'Forwarder#sendRequests'
    it('should return Promise objects for each servers', function() {
      const sendRequests = Forwarder.createSendRequests(request, servers);
      expect(sendRequests.length).to.equal(servers.length);
      sendRequests.forEach(request => {
        expect(request instanceof Promise).to.be.true;
      });
    });
  });

  describe('Forwarder#sendRequests', () => {
    const same200ResServers = [
      `http://${mockServerHost}:${mockServer200Port}`,
      `http://${mockServerHost}:${mockServer200Port}`
    ];
    const same404ResServers = [
      `http://${mockServerHost}:${mockServer404Port}`,
      `http://${mockServerHost}:${mockServer404Port}`
    ];
    const differentResServers = [
      `http://${mockServerHost}:${mockServer200Port}`,
      `http://${mockServerHost}:${mockServer404Port}`
    ];

    const request = {
      protocol: 'http',
      host: mockServerHost,
      port: mockServerPort,
      url: '/',
      method: 'GET',
      headers: {
        "Content-Type": "text/plain"
      },
      body: 'this is body to two servers!'
    };

    it('should return a single success response object if status codes are the same', function() {
      Forwarder.sendRequests(Forwarder.createSendRequests(request, same200ResServers))
        .then(singleResponse => {
          expect(singleResponse.statusCode).to.not.equal(500);
          expect(singleResponse.statusCode).to.equal(200);
        });
      Forwarder.sendRequests(Forwarder.createSendRequests(request, same404ResServers))
        .then(singleResponse => {
          expect(singleResponse.statusCode).to.not.equal(500);
          expect(singleResponse.statusCode).to.equal(404);
        });
    });

    it('should return a single error response object if status codes are different', function() {
      Forwarder.sendRequests(Forwarder.createSendRequests(request, differentResServers))
        .then(singleResponse => {
          expect(singleResponse.statusCode).to.equal(500);
        });
    });

    it.skip('should return a single error response object if error occurred while processing', function() {

    });
  });
});
