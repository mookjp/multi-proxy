import fs from 'fs-extra'
import path from 'path'
import winston from 'winston'

export default class Logger {
  constructor (config) {
    this.level = config.level || 'info'

    if (config.file.filename) {
      Logger.createLogFile(config.file.filename)
    }

    winston.loggers.add('default', config)
    this.logger = winston.loggers.get('default')
  }

  log (message, level = null) {
    if (this.logger) {
      this.logByWinston(message, level || this.level)
      return
    }
    this.logByStdout(message)
  }

  logByWinston (message, level) {
    this.logger.log(level, message)
  }

  logByStdout (message) {
    console.log(message)
  }

  static createLogFile (logFilePath) {
    try {
      fs.accessSync(logFilePath)
    } catch (error) {
      fs.mkdirsSync(path.dirname(logFilePath))
      fs.writeFileSync(logFilePath, '')
    }
  }
}
