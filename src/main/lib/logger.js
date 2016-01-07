import extend from 'extend'
import log4js from 'log4js'

export const LOGTYPE = {
  DATEFILE: 'dateFile',
  CONSOLE: 'console'
}

const dateFileConfig = {
  appenders: [
    {
      category: 'multi-proxy',
      type: 'dateFile',
      filename: process.env.MULTIPROXY_LOG_PATH || './logs/multi-proxy',
      pattern: '-yyyy-MM-dd-hh',
      alwaysIncludePattern: false
    }
  ]
}

const consoleConfig = {
  appenders: [
    {
      category: 'multi-proxy',
      type: 'console'
    }
  ]
}

export const additionalConfig = {
  type: LOGTYPE.DATEFILE,
  level: log4js.levels.DEBUG
}

export function getLogger (config = additionalConfig) {
  log4js.configure(createFinalConfig(config))
  return log4js.getLogger('multi-proxy')
}

export function createFinalConfig (additionalConfig) {
  const levelConfig = {
    appenders: [
      {
        level: additionalConfig.level || log4js.levels.DEBUG
      }
    ]
  }

  if (additionalConfig.type === LOGTYPE.DATEFILE) {
    return extend(true, {}, dateFileConfig, levelConfig)
  }
  return extend(true, {}, consoleConfig, levelConfig)
}
