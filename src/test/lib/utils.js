import { expect } from 'chai'
import { isMatchedPattern } from '../../main/lib/utils'

describe('isMatchedPath', () => {
  it('should return true if matched path was given', function () {
    expect(isMatchedPattern(
      [{ method: 'GET', path: /\/my\.index\/my\.type/ }],
      'GET',
      '/my.index/my.type'))
      .to.be.true
    expect(isMatchedPattern(
      [{ method: 'GET', path: /\/my\.index\/my\.type\/something/ }],
      'GET',
      '/my.index/my.type/something'))
      .to.be.true
    expect(isMatchedPattern(
      [{ method: 'GET', path: /\/another\.index\/another\.type/ }],
      'GET',
      '/another.index/another.type'))
      .to.be.true
    expect(isMatchedPattern(
      [{ method: 'GET', path: /\/another\.index\/another\.type\/something/ }],
      'GET',
      '/another.index/another.type/something'))
      .to.be.true
  })

  it('should return false if not-matched path was given', function () {
    expect(isMatchedPattern(
      [{ method: 'GET', path: /\/my\.index\/her\.type/ }],
      'GET',
      '/my.index/hertype'))
      .not.to.be.true
    expect(isMatchedPattern(
      [{ method: 'GET', path: /\/something$/ }],
      'GET',
      '/something/'))
      .not.to.be.true
    expect(isMatchedPattern(
      [{ method: 'GET', path: /\/another\.index\/another/ }],
      'GET',
      '/something/different'))
      .not.to.be.true
  })
})
