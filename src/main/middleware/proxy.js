import Forwarder from '../lib/forwarder'
import { isMatchedPattern } from '../lib/utils'
import Logger from '../lib/logger'

export default function multiProxy (servers, patterns, config = null) {
  const logger = config ? new Logger(config) : new Logger()

  if (servers.master) {
    return (req, res, next) => {
      if (!isMatchedPattern(patterns, req.method, req.url)) {
        logger.log({
          message: 'Pattern does not match',
          requestMethod: req.method,
          requestUrl: req.url
        }, 'verbose')
        next()
      } else {
        res.on('end', () => { next() })

        const masterPromise = Forwarder.createSendRequests(req, [servers.master])[0]
        const replicaPromises = Forwarder.createSendRequests(req, servers.replica)
        logger.log('Start to send request', 'verbose')
        masterPromise
          .then(masterRequest => {
            logger.log('Got response from master', 'verbose')
            logger.log(masterRequest.response.toJSON(), 'verbose')

            Forwarder.sendRequestsWithMaster(replicaPromises)
              .then(replicaSumObjs => {
                logger.log('Got response from replicas', 'verbose')
                replicaSumObjs.forEach(obj => {
                  logger.log(obj.response.toJSON(), 'verbose')
                })
              })
              .catch(error => {
                // Ignore the case if the results from replicas do not match with each other
                logger.log('Got error while sending requests to replicas but this wil be ignored', 'info')
                logger.log(error, 'info')
              })
              .finally(() => {
                masterRequest.requestStream.resume()
                masterRequest.requestStream.pipe(res)
              })
          })
          .catch(error => {
            logger.log('Got an error while sending a request to master', 'error')
            logger.log(error, 'error')
            next(new Error(error))
          })
      }
    }
  }

  return (req, res, next) => {
    if (!isMatchedPattern(patterns, req.method, req.url)) {
      logger.log({
        message: 'Pattern does not match',
        requestMethod: req.method,
        requestUrl: req.url
      }, 'verbose')
      next()
    } else {
      res.on('end', () => {
        next()
      })

      const requestPromises = Forwarder.createSendRequests(req, servers.replica)
      Forwarder.sendRequestsWithoutMaster(requestPromises)
        .then(singleRequest => {
          logger.log('Got response from the one of replicas', 'verbose')
          logger.log(singleRequest.response.toJSON(), 'verbose')

          singleRequest.resume()
          singleRequest.pipe(res)
        })
        .catch((error) => {
          logger.log('Got an error while sending a request to replicas', 'error')
          logger.log(error, 'error')
          next(new Error(error))
        })
    }
  }
}
