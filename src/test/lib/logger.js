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
  const logger = new Logger({
    file: {
      filename: logPath
    }
  })

  before(() => {
    createTmpDir(tmpDirPath)
  })

  afterEach(() => {
    removeAllFilesInDir(tmpDirPath)
  })

  it('should output log to specified path', () => {
    logger.log(logMessage, () => {
      const logStr = fs.readFileSync(logPath).toString()
      expect(new RegExp(logMessage).test(logStr)).to.be.true
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
