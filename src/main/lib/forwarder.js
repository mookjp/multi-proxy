import http from 'http';
import url from 'url';
import _ from 'underscore';

import Promise from 'bluebird';
const request = Promise.promisifyAll(Promise.promisify(require('request')));

export default class Forwarder {

  static sendRequest(req) {
    return new Promise((resolve, reject) => {
      // TODO: Investicate about options for http.request
      const requiredHeaders = ['headers', 'method', 'url'];
      const isFulfilledRequired =
        requiredHeaders.every(key => {
          return req.hasOwnProperty(key)
        });
      if (!isFulfilledRequired) {
        reject(`Request does not have requested parameters: ${requiredHeaders}`);
      }

      let responseStr = '';
      const forwardRequest = http.request(this.createRequestOption(req), res => {
        // Create proxy response object
        // TODO: Check status code first on 'data' event, then resolve with status code and writable stream
        let proxyResponse = this.createProxyResponse(res);
        proxyResponse.isMaster = request.isMaster || false;
        res.on('data', (chunk) => { responseStr += chunk });
        res.on('end', () => {
          proxyResponse.body = responseStr;
          resolve(proxyResponse);
        });
      });
      forwardRequest.on('error', error => { reject(error) });
      // TODO: Could be stream?
      forwardRequest.end(req.body || '');
    });
  };

  static createProxyResponse(res) {
    return {
      statusCode: res.statusCode,
      headers: res.headers,
      isMaster: res.isMaster || false
    };
  }

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

  static createSendRequest(req, server) {
    const serverUrl = url.parse(server);
    req.protocol = serverUrl.protocol;
    req.host = serverUrl.hostname;
    req.port = serverUrl.port;
    req.isMaster = true;
    return this.sendRequest(req);
  };

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
      path: req.url,
      headers: req.headers
    }
  }
}