import Forwarder from '../lib/forwarder';
import Promise from 'bluebird';

export default class Proxy {

  constructor(servers, patterns) {
    this.hasMaster = servers.master ? true : false;
    this.servers = servers;
    this.patterns = patterns;
  }

  /**
   * Proxy middleware function to pass request to some destinations
   * if configured pattern matches to destination.
   *
   * @param req
   * @param res
   * @param next
   */
  proxyRequest(req, res, next) {
    if(this.hasMaster) {
      return this.proxyRequestWithMaster(req, res, next);
    }
    return this.proxyRequestWithoutMaster(req, res, next);
  }

  // TODO: Implement proxy with master
  // If servers object has master, the response from this proxy should be the same
  // as master server.
  proxyRequestWithMaster(req, res, next) {}

  proxyRequestWithoutMaster(req, res, next) {
    const isMatched = this.patterns.some(pattern => {
      return pattern.test(req.url);
    });

    if (isMatched) {
      const requests = Forwarder.createSendRequests(req, this.servers.replica);
      Forwarder.sendRequests(requests)
        .then(singleResponse => {
          // TODO: could be better
          this.formatHeaders(res, singleResponse).then(success => {
            next();
          });
        });
    }
  }

  // TODO: Confirm which header should be overwritten
  formatHeaders(res, proxyResponse) {
    return new Promise((resolve, reject) => {
      try {
        Object.keys(proxyResponse.headers).forEach(key => {
          res.setHeader(key, proxyResponse.headers[key]);
        });
        res.writeHead(proxyResponse.statusCode);
        res.end(proxyResponse.body);
        resolve(true);
      } catch (error) {
        reject(error);
      }
    });
  }
}
