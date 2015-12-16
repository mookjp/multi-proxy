import http from 'http';
import connect from 'connect';

import ProxyServer from '../src/main/middleware/proxy';

// Create fake destination servers
let destinationOrig = connect();
destinationOrig.use((req, res, next) => {
  "use strict";
  res.writeHead(200, 'Content-Type: text/plain');
  res.end('\nDestination original!');
  next();
});
let destinationFirst = connect();
destinationFirst.use((req, res, next) => {
  "use strict";
  res.writeHead(200, 'Content-Type: text/plain');
  res.end('\nDestination first!');
  next();
});
let destinationSecond = connect();
destinationSecond.use((req, res, next) => {
  res.writeHead(200, 'Content-Type: text/plain');
  res.end('\nDestination second!');
  next();
});

// Stert to listen
const origPort = 4410;
const firstPort = 4411;
const secondPort = 4412;
http.createServer(destinationOrig).listen(origPort);
http.createServer(destinationFirst).listen(firstPort);
http.createServer(destinationSecond).listen(secondPort);

// Create url patterns to send requests to some destinations
const patterns = [
  /^\/index/,
  /-suffix$/
];

// Create destination list
const servers = {
  // master should be a single endpoint
  master: `http://localhost:${origPort}`,

  // replica can have several endpoints
  replica: [
    `http://localhost:${firstPort}`,
    `http://localhost:${secondPort}`
  ]
};

let proxy = new ProxyServer(servers, patterns);
let app = connect();
app.use((req, res, next) => {
  "use strict";
  // Use inside the function because of "this" problem
  proxy.proxyRequest(req, res, next);
});

const proxyPort = 9999;
http.createServer(app).listen(proxyPort);
console.log(`Proxy server is listening on port ${proxyPort}`);