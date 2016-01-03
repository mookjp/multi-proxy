export function createErrorObject (error) {
  return {
    message: error.toString(),
    responsesFromDestinations: error.responses.map(res => { return res.toJSON() }) || ''
  }
}

export function isMatchedPattern (patterns, method, path) {
  return patterns.some(pattern => {
    return pattern.method === method &&
      pattern.path.test(path)
  })
}
