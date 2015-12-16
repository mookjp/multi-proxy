import http from 'http';
import { expect } from 'chai';
import Promise from 'bluebird';

import Proxy from '../../main/middleware/proxy';

describe('ProxyWithMaster', () => {
  "use strict";
  let proxy;
  const servers = {
    master: '',
    nodes: ['']
  };
  let patterns = [
    /^\/my\.index\/my\.type/,
    /^\/another\.index\/another\.type/
  ];

  describe('Proxy#isMatchedPath', () => {
    proxy = new Proxy(servers, patterns);

    it('should return true if matched path was given', function() {
      expect(proxy.isMatchedPath('/my.index/my.type')).to.be.true;
      expect(proxy.isMatchedPath('/my.index/my.type/something')).to.be.true;
      expect(proxy.isMatchedPath('/another.index/another.type')).to.be.true;
      expect(proxy.isMatchedPath('/another.index/another.type/something')).to.be.true;
    });

    it('should return false if not-matched path was given', function() {
      expect(proxy.isMatchedPath('/my.index/her.type')).not.to.be.true;
      expect(proxy.isMatchedPath('/something')).not.to.be.true;
      expect(proxy.isMatchedPath('/another.index/another/')).not.to.be.true;
    });
  });
});
