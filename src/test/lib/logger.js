import { expect } from 'chai'
import { createFinalConfig, additionalConfig, LOGTYPE } from '../../main/lib/logger'
import log4js from 'log4js'

describe('createFinalConfig', () => {
  const defaultConfig = {
    replaceConsole: true,
    appenders: [
      {
        level: log4js.levels.DEBUG,
        category: 'multi-proxy',
        type: 'dateFile',
        filename: process.env.MULTIPROXY_LOG_PATH || './logs/multi-proxy',
        pattern: '-yyyy-MM-dd-hh',
        alwaysIncludePattern: false
      }
    ]
  }

  const consoleConfig = {
    replaceConsole: true,
    appenders: [
      {
        level: log4js.levels.DEBUG,
        category: 'multi-proxy',
        type: 'console'
      }
    ]
  }

  const consoleConfigWithInfoLevel = {
    replaceConsole: true,
    appenders: [
      {
        level: log4js.levels.INFO,
        category: 'multi-proxy',
        type: 'console'
      }
    ]
  }

  const dateFileConfigWithInfoLevel = {
    replaceConsole: true,
    appenders: [
      {
        level: log4js.levels.INFO,
        category: 'multi-proxy',
        type: 'dateFile',
        filename: process.env.MULTIPROXY_LOG_PATH || './logs/multi-proxy',
        pattern: '-yyyy-MM-dd-hh',
        alwaysIncludePattern: false
      }
    ]
  }

  it('should return logger with default config if additionalConfig is the default one', () => {
    const config = createFinalConfig(additionalConfig)
    expect(config).to.eql(defaultConfig)
  })

  it('should return logger with file appender if additionalConfig has dateFile type', () => {
    const config = createFinalConfig({
      type: LOGTYPE.DATEFILE
    })
    expect(config).to.eql(defaultConfig)
  })

  it('should return logger with console appender if additionalConfig has console type', () => {
    const config = createFinalConfig({
      type: LOGTYPE.CONSOLE
    })
    expect(config).to.eql(consoleConfig)
  })

  it('should return logger with console appender as info level if additionalConfig has console type and info level', () => {
    const config = createFinalConfig({
      type: LOGTYPE.CONSOLE,
      level: log4js.levels.INFO
    })
    expect(config).to.eql(consoleConfigWithInfoLevel)
  })

  it('should return logger with dateFile appender as info level if additionalConfig has dateFile type and info level', () => {
    const config = createFinalConfig({
      type: LOGTYPE.DATEFILE,
      level: log4js.levels.INFO
    })
    expect(config).to.eql(dateFileConfigWithInfoLevel)
  })
})
