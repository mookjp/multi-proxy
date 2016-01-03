import fs from 'fs-extra'
import path from 'path'
import winston from 'winston'

export default class Logger {
  constructor (config) {
    if (config.file.filename) {
      Logger.createLogFile(config.file.filename)
    }

    winston.loggers.add('default', config)
    this.logger = winston.loggers.get('default')
  }

  log (message, level = 'info') {
    this.logger.log(level, message)
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
