import http from 'http';
import { expect } from 'chai';
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
  let mockServerReturns404;

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

    mockServerReturns404 = http.createServer((req, res) => {
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
    mockServerReturns404.close();
  });

  describe('Forwarder#createSendRequest', () => {
    const servers = [
      `http://${mockServerHost}:${mockServer200Port}`,
      `http://${mockServerHost}:${mockServer404Port}`
    ];

    it('should return Promise objects for each servers', function() {
      const req = {
        url: servers[0], // This is not related to the test case
        pipe: (stream) => {
          expect(stream.writable).to.be.true;
        }
      };
      const sendRequests = Forwarder.createSendRequests(req, servers);
      expect(sendRequests.length).to.equal(servers.length);
      sendRequests.forEach(request => {
        expect(request instanceof Promise).to.be.true;
      });
    });
  });

});
