import http from 'http';
import connect from 'connect';

// Create destination list
const servers = [
  'http://localhost:9200',
  'http://localhost:9210'
];

// Create url patterns to send requests to some destinations
const patterns = [];

let app = connect();
let proxy = new ProxyServer(servers, patterns);
app.use(proxy.proxyRequest);

const port = 9999;
http.createServer(app).listen(port);
console.log(`Proxy server is listening on port ${port}`);