import Forwarder from '../lib/forwarder'
import { isMatchedPattern } from '../lib/utils'
import { getLogger } from '../lib/logger'

export default function multiProxy (servers, patterns, config = null) {
  const logger = config ? getLogger(config) : getLogger()

  if (servers.master) {
    return (req, res, next) => {
      if (!isMatchedPattern(patterns, req.method, req.url)) {
        logger.debug('Pattern does not match',
          {
            requestMethod: req.method,
            requestUrl: req.url
          }
        )
        next()
      } else {
        res.on('end', () => { next() })

        const masterPromise = Forwarder.createSendRequests(req, [servers.master])[0]
        const replicaPromises = Forwarder.createSendRequests(req, servers.replica)
        logger.debug('Start to send request')
        masterPromise
          .then(masterRequest => {
            logger.debug('Got response from master', JSON.stringify(masterRequest.response))
            if (/^5/.test(masterRequest.response.statusCode)) {
              masterRequest.requestStream.resume()
              masterRequest.requestStream.pipe(res)
              return
            }

            Forwarder.sendRequestsWithMaster(replicaPromises)
              .then(replicaSumObjs => {
                const responses = replicaSumObjs.map(obj => {
                  return obj.response
                })
                logger.debug('Got response from replicas', JSON.stringify(responses))
              })
              .catch(error => {
                // Ignore the case if the results from replicas do not match with each other
                logger.info('Got error while sending requests to replicas but this wil be ignored')
                logger.info(error)
              })
              .finally(() => {
                masterRequest.requestStream.resume()
                masterRequest.requestStream.pipe(res)
              })
          })
          .catch(error => {
            logger.error('Got an error while sending a request to master', error)
            next(new Error(error))
          })
      }
    }
  }

  return (req, res, next) => {
    if (!isMatchedPattern(patterns, req.method, req.url)) {
      logger.debug('Pattern does not match',
        {
          requestMethod: req.method,
          requestUrl: req.url
        })
      next()
    } else {
      res.on('end', () => {
        next()
      })

      const requestPromises = Forwarder.createSendRequests(req, servers.replica)
      Forwarder.sendRequestsWithoutMaster(requestPromises)
        .then(singleRequest => {
          logger.debug('Got response from the one of replicas',
            JSON.stringify(singleRequest.response))

          singleRequest.resume()
          singleRequest.pipe(res)
        })
        .catch((error) => {
          logger.error('Got an error while sending a request to replicas', error)
          next(new Error(error))
        })
    }
  }
}
