import http from 'http';
import url from 'url';

import Promise from 'bluebird';
import _ from 'underscore';
import request from 'request';

export default class Forwarder {

  static createSendRequests(req, servers) {
    return servers.map(server => {
      const requestStream = request({url: url.resolve(server, req.url)});
      const requestPromise = new Promise((resolve, reject) => {
        requestStream.on('response', (response) => {
          requestStream.pause();
          resolve({requestStream: requestStream, response: response});
        });
      });
      req.pipe(requestStream);
      return requestPromise;
    });
  }

  static sendRequestsWithoutMaster(promisedRequests) {
    return Promise.all(promisedRequests)
    .then(resObjs => {
      const statusCodes = resObjs.map((resObj) => {
        return resObj.response.statusCode;
      });
      if (_.uniq(statusCodes).length > 1 ) {
        resObjs.forEach(resObj => {
          resObj.requestStream.destroy();
        });
        let error = new Error('status codes did not match with each other');
        error.responses = resObjs.map((resObj => {
          return resObj.response;
        }));
        throw error;
      }
      // Get a response then abandon other streams
      const result = resObjs.shift();
      resObjs.forEach(resObj => {
        resObj.requestStream.destroy();
      });
      return result.requestStream;
    })
  }

  static sendRequestsWithMaster(promisedRequests) {
    return Promise.all(promisedRequests)
      .then(resObjs => {
        resObjs.forEach(resObj => {
          resObj.requestStream.destroy();
        });
        return resObjs.map(resObj => {
          return resObj.response.toJSON();
        });
      })
  }

  static sendRequests(promisedRequests, withMaster=false) {
    if (withMaster) {
      return Forwarder.sendRequestsWithMaster(promisedRequests);
    }
    return Forwarder.sendRequestsWithoutMaster(promisedRequests);
  }
}