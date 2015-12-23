import Forwarder from '../lib/forwarder';
import Promise from 'bluebird';

export default class Proxy {

  static proxyRequest(servers, patterns) {
    if (servers.master) {
      return (req, res, next) => {
        res.on('end', () => { next() });

        if (Proxy.isMatchedPattern(patterns, req.method, req.url)) {
          const masterPromises = Forwarder.createSendRequests(req, [servers.master]);
          const replicaPromises = Forwarder.createSendRequests(req, servers.replica);
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
                  // TODO: could be with logger;
                  console.log(JSON.stringify(Proxy.createErrorObject(error)));
                })
            })
            .catch((error) => {
              next(new Error(error));
            });
        }
      }
    }

    return (req, res, next) => {
      res.on('end', () => { next() });

      if (Proxy.isMatchedPattern(patterns, req.method, req.url)) {
        const requestPromises = Forwarder.createSendRequests(req, servers.replica);
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
  }

  static createErrorObject(error) {
    return {
      message: error.toString(),
      responsesFromDestinations: error.responses.map(res => {return res.toJSON()}) || ''
    };
  }

  static isMatchedPattern(patterns, method, path) {
    return patterns.some(pattern => {
      return pattern.method === method
          && pattern.path.test(path);
    });
  }
}
