var http = require('http');
var connect = require('connect');

var multiProxy = require('multi-proxy');

// Create fake destination servers
var destinationOrig = connect();
destinationOrig.use(function(req, res, next) {
  res.writeHead(200, 'Content-Type: text/plain');
  res.end('Destination original!');
  next();
});
var destinationFirst = connect();
destinationFirst.use(function(req, res, next) {
  res.writeHead(200, 'Content-Type: text/plain');
  res.end('Destination first!');
  next();
});
var destinationSecond = connect();
destinationSecond.use(function(req, res, next) {
  res.writeHead(200, 'Content-Type: text/plain');
  res.end('Destination second!');
  next();
});

// Stert to listen
var origPort = 4410;
var firstPort = 4411;
var secondPort = 4412;
http.createServer(destinationOrig).listen(origPort);
http.createServer(destinationFirst).listen(firstPort);
http.createServer(destinationSecond).listen(secondPort);

// Create url patterns to send requests to some destinations
var patterns = [
  { method: 'POST', path: /^\/myindex\/[^\/]+$/ },
  { method: 'POST', path: /^\/myindex$/ }
];

// Create destination list
var servers = {
  // master should be a single endpoint
  master: 'http://localhost:' + origPort,

  // replica can have several endpoints
  replica: [
    'http://localhost:' + firstPort,
    'http://localhost:' + secondPort
  ]
};
var app = connect();
app.use(multiProxy(servers, patterns));

var proxyPort = 9999;
http.createServer(app).listen(proxyPort);
console.log('Proxy server is listening on port ' + proxyPort);