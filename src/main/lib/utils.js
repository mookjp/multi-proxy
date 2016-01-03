export function isMatchedPattern (patterns, method, path) {
  return patterns.some(pattern => {
    return pattern.method === method &&
      pattern.path.test(path)
  })
}
