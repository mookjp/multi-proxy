import fs from 'fs-extra'
import path from 'path'
import { expect } from 'chai'
import Logger from '../../main/lib/logger'

const tmpDirPath = './tmp'

function removeAllFilesInDir (dirPath) {
  fs.readdirSync(dirPath).forEach(file => {
    fs.unlinkSync(path.join(dirPath, file))
  })
}

function createTmpDir (dirPath) {
  try {
    fs.accessSync(dirPath)
  } catch (error) {
    fs.mkdirSync(dirPath)
  }
}

describe('Logger', () => {
  const logPath = path.join(tmpDirPath, 'logfile.log')
  const logMessage = 'this should output log to specified path'
  const loggerWithFile = new Logger({
    file: {
      filename: logPath
    }
  })
  const loggerWithoutConfig = new Logger()

  before(() => {
    createTmpDir(tmpDirPath)
  })

  afterEach(() => {
    removeAllFilesInDir(tmpDirPath)
  })

  it('should output log to specified path', () => {
    loggerWithFile.log(logMessage, () => {
      expect(loggerWithFile.transports.hasOwnProperty('console')).to.be.true
      expect(loggerWithFile.transports.hasOwnProperty('file')).to.be.true
      const logStr = fs.readFileSync(logPath).toString()
      expect(new RegExp(logMessage).test(logStr)).to.be.true
    })
  })

  it('should output log to stdout if config was not defined', () => {
    loggerWithoutConfig.log(logMessage, () => {
      expect(loggerWithFile.transports.hasOwnProperty('console')).to.be.true
      expect(loggerWithFile.transports.hasOwnProperty('file')).to.be.false
      expect(fs.readdirSync(tmpDirPath).length).equals.to(0)
    })
  })
})

describe('Logger#createLogFile', () => {
  before(() => {
    createTmpDir(tmpDirPath)
  })

  afterEach(() => {
    removeAllFilesInDir(tmpDirPath)
  })

  it('should create log file if it does not exist', () => {
    const filePath = path.join(tmpDirPath, 'newfile')
    Logger.createLogFile(filePath)
    // If file was not created, it throws an exception
    fs.accessSync(filePath)
  })
})
