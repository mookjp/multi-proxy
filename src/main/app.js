import http from 'http';

http.createServer((req, res) => {
  let body = '';
  req.on('data', data => {
    body += data;
  });
  req.on('end', () => {
    "use strict";
    const headers = {

    };
    res.writeHead(200, req.headers);
    res.end(body);
  });
}).listen(1337, '127.0.0.1');

console.log('Server running at http://127.0.0.1:1337/');