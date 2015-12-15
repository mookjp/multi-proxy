import http from 'http';
import url from 'url';
import _ from 'underscore';

import Promise from 'bluebird';
const request = Promise.promisifyAll(Promise.promisify(require('request')));

export default class Forwarder {

  constructor(options) {
    this.options = _.pick(options, 'patterns', 'endpoints');
  }

  static sendRequest(req) {
    return new Promise((resolve, reject) => {
      // TODO: Investicate about options for http.request
      if (['_headers', 'method', 'path'].every(key => {req.hasOwnProperty(key)})) {
        reject('Request does not have requested parameters: headers, method, path');
      }

      let responseStr = '';
      let response = {};
      const forwardRequest = http.request(this.createRequestOption(req), res => {
        // TODO: This line could be on Stream API?
        response.statusCode = res.statusCode;
        response.headers = res.headers;
        res.on('data', (chunk) => { responseStr += chunk });
        res.on('end', () => {
          response.body = responseStr;
          resolve(response);
        });
      });
      forwardRequest.on('error', error => { reject(error) });
      // TODO: Could be stream?
      forwardRequest.end(req.body || '');
    });
  };

  // TODO: write docs
  // req... request object; this is the original for this library
  // servers ... array having some endpoints e.g. http://localhost:9200/
  static createSendRequests(req, servers) {
    return servers.map(server => {
      const serverUrl = url.parse(server);
      req.protocol = serverUrl.protocol;
      req.host = serverUrl.hostname;
      req.port = serverUrl.port;
      return this.sendRequest(req);
    });
  }

  static sendRequests(promisedRequests) {
    return Promise.all(promisedRequests)
    .then(responses => {
      const statusCodes = responses.map((response) => {
        return response.statusCode;
      });
      if (_.uniq(statusCodes).length > 1 ) {
        // TODO: return error code 500(Service internal error)?
        // message should tell an user that some requests succeeded.
        return this.createErrorResponse('Status code are not matched with each other', responses);
      }
      return responses[0];
    })
    .catch(error => {
      // TODO: return error code 500(Service internal error)?
      return this.createErrorResponse(null, error);
    });
  }

  static createErrorResponse(message, error) {
    return {
      statusCode: 500,
      // TODO: Create headers
      headers: {},
      body: `${message || 'error'}: ${JSON.stringify(error)}`
      // TODO: sucking variable
    };
  }

  // TODO: needs validator
  static createRequestOption(req) {
    const protocol = req.protocol.slice(-1) === ':' ? req.protocol : req.protocol += ':';
    return {
      // TODO: This could be https
      protocol: protocol,
      host: req.host,
      port: req.port,
      method: req.method,
      path: req.path,
      headers: req._headers
    }
  }
}