import url from 'url'

import Promise from 'bluebird'
import _ from 'underscore'
import request from 'request'

export default class Forwarder {

  static createSendRequests (req, servers) {
    return servers.map(server => {
      const requestStream = request({url: url.resolve(server, req.url)})
      const requestPromise = new Promise((resolve, reject) => {
        requestStream.on('response', (response) => {
          requestStream.pause()
          resolve({requestStream: requestStream, response: response})
        })
        requestStream.on('error', (error) => {
          reject(error)
        })
      })
      req.pipe(requestStream)
      return requestPromise
    })
  }

  static sendRequestsWithoutMaster (promisedRequests) {
    return Promise.all(promisedRequests)
    .then(resObjs => {
      const statusCodes = resObjs.map((resObj) => {
        return resObj.response.statusCode
      })
      if (_.uniq(statusCodes).length > 1) {
        resObjs.forEach(resObj => {
          resObj.requestStream.destroy()
        })
        let error = new Error('status codes did not match with each other')
        error.responses = resObjs.map(resObj => {
          return resObj.response
        })
        throw error
      }
      // Get a response then abandon other streams
      const result = resObjs.shift()
      resObjs.forEach(resObj => {
        resObj.requestStream.destroy()
      })
      return result.requestStream
    })
  }

  static sendRequestsWithMaster (promisedRequests) {
    return Promise.all(promisedRequests)
      .then(resObjs => {
        resObjs.forEach(resObj => {
          resObj.requestStream.destroy()
        })
        return resObjs
      })
  }
}
