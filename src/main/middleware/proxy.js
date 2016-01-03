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

                masterRequest.requestStream.resume()
                masterRequest.requestStream.pipe(res)
              })
              .catch(error => {
                // Ignore the case if the results from replicas do not match with each other
                logger.log('Got error while sending a request', 'error')
                logger.log(error, 'error')
                next(new Error(error))
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
          next(new Error(JSON.stringify(createErrorObject(error))))
        })
    }
  }
}
