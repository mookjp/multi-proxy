export function createErrorObject(error) {
  'use strict';
  return {
    message: error.toString(),
    responsesFromDestinations: error.responses.map(res => {return res.toJSON()}) || ''
  };
}

export function isMatchedPattern(patterns, method, path) {
  'use strict';
  return patterns.some(pattern => {
    return pattern.method === method
      && pattern.path.test(path);
  });
}
