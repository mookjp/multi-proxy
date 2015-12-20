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
  proxyRequestWithMaster(req, res, next) {
    res.on('end', () => { next() });

    if (this.isMatchedPattern(req.method, req.url)) {
      const masterPromises = Forwarder.createSendRequests(req, [this.servers.master]);
      const replicaPromises = Forwarder.createSendRequests(req, this.servers.replica);
      Forwarder.sendRequests(masterPromises, false)
        .then(masterRequest => {
          Forwarder.sendRequests(replicaPromises, true)
            .then(replicaSumObj => {
              // TODO: should be to logger
              console.log(replicaSumObj);
              masterRequest.resume();
              masterRequest.pipe(res);
            })
            .catch(error => {
              // Ignore the case if the results from replicas do not match with each other
            })
        })
        .catch((error) => {
          // TODO: could be better to have an handler or something
          next(new Error(error));
        });
    }
  }

  proxyRequestWithoutMaster(req, res, next) {
    res.on('end', () => { next() });

    if (this.isMatchedPattern(req.method, req.url)) {
      const requestPromises = Forwarder.createSendRequests(req, this.servers.replica);
      Forwarder.sendRequests(requestPromises)
        .then(singleRequest => {
          singleRequest.resume();
          singleRequest.pipe(res);
        })
        .catch((error) => {
          res.writeHead(500, {'Content-Type': 'application/json'});
          res.end(JSON.stringify(Proxy.createErrorObject(error)));
        });
    }
  }

  static createErrorObject(error) {
    return {
      message: error.toString(),
      responsesFromDestinations: error.responses.map(res => {return res.toJSON()}) || ''
    };
  }

  isMatchedPattern(method, path) {
    return this.patterns.some(pattern => {
      return pattern.method === method
          && pattern.path.test(path);
    });
  }
}
