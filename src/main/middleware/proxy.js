import Forwarder from '../lib/forwarder';

export default class Proxy {

  constructor(servers, patterns) {
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
    const isMatched = this.patterns.some(pattern => {
      return pattern.test(req.headers.url);
    });

    if (isMatched) {
      const requests = Forwarder.createSendRequests(req, this.servers);
      Forwarder.sendRequests(requests)
        .then(singleResponse => {
          res = singleResponse;
          return res;
        });
    }
    next();
  }
}