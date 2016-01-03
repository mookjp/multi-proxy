import Forwarder from '../lib/forwarder'
import { isMatchedPattern, createErrorObject } from '../lib/utils'
import Logger from '../lib/logger'

export default function multiProxy (servers, patterns, config = null) {
  const logger = config ? new Logger(config) : new Logger()

  if (servers.master) {
    return (req, res, next) => {
      if (!isMatchedPattern(patterns, req.method, req.url)) {
        next()
      } else {
        res.on('end', () => { next() })

        const masterPromise = Forwarder.createSendRequests(req, [servers.master])[0]
        const replicaPromises = Forwarder.createSendRequests(req, servers.replica)
        masterPromise
          .then(masterRequest => {

            Forwarder.sendRequestsWithMaster(replicaPromises)
              .then(replicaSumObjs => {
                replicaSumObjs.forEach(obj => {
                  logger.log(obj.response.toJSON(), 'verbose')
                })

                masterRequest.requestStream.resume()
                masterRequest.requestStream.pipe(res)
              })
              .catch(error => {
                // Ignore the case if the results from replicas do not match with each other
                logger.log(JSON.stringify(createErrorObject(error)), 'error')
                next(new Error(error))
              })
          })
          .catch(error => {
            next(new Error(error))
          })
      }
    }
  }

  return (req, res, next) => {
    if (!isMatchedPattern(patterns, req.method, req.url)) {
      next()
    } else {
      res.on('end', () => {
        next()
      })

      const requestPromises = Forwarder.createSendRequests(req, servers.replica)
      Forwarder.sendRequestsWithoutMaster(requestPromises)
        .then(singleRequest => {
          singleRequest.resume()
          singleRequest.pipe(res)
        })
        .catch((error) => {
          next(new Error(JSON.stringify(createErrorObject(error))))
        })
    }
  }
}
