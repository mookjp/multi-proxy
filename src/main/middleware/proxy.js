import Promise from 'bluebird';
import Forwarder from '../lib/forwarder';
import { isMatchedPattern, createErrorObject } from '../lib/utils';

export default function multiProxy(servers, patterns) {
  'use strict';
  if (servers.master) {
    return (req, res, next) => {
      if (!isMatchedPattern(patterns, req.method, req.url)) {
        next();
      } else {
        res.on('end', () => {
          next()
        });

        const masterPromise = Forwarder.createSendRequests(req, [servers.master])[0];
        const replicaPromises = Forwarder.createSendRequests(req, servers.replica);
        masterPromise
          .then(masterRequest => {
            Forwarder.sendRequestsWithMaster(replicaPromises)
              .then(replicaSumObjs => {
                // TODO: should be to logger
                replicaSumObjs.forEach(obj => {
                  console.log(obj.response.toJSON());
                });
                masterRequest.requestStream.resume();
                masterRequest.requestStream.pipe(res);
              })
              .catch(error => {
                // Ignore the case if the results from replicas do not match with each other
                // TODO: could be with logger;
                console.log(JSON.stringify(createErrorObject(error)));
                throw new Error(error);
              })
          })
          .catch((error) => {
            next(new Error(error));
          });
      }
    }
  }

  return (req, res, next) => {
    if (!isMatchedPattern(patterns, req.method, req.url)) {
      next();
    } else {
      res.on('end', () => {
        next()
      });

      const requestPromises = Forwarder.createSendRequests(req, servers.replica);
      Forwarder.sendRequestsWithoutMaster(requestPromises)
        .then(singleRequest => {
          singleRequest.resume();
          singleRequest.pipe(res);
        })
        .catch((error) => {
          res.writeHead(500, {'Content-Type': 'application/json'});
          res.end(JSON.stringify(createErrorObject(error)));
        });
    }
  }
}
