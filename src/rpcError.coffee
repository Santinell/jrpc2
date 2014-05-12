abstract = (message, code = -32099, id = 0) ->
  id: id
  jsonrpc: '2.0'
  error: { code: code, message: message }

parseError = (id = 0) ->
  abstract 'ParseError', -32700, id

invalidRequest = (id = 0) ->
  abstract 'InvalidRequest', -32600, id

methodNotFound = (id = 0) ->
  abstract 'MethodNotFound', -32601, id

serverError = (id = 0) ->
  abstract 'ServerError', -32000, id


exports.abstract = abstract
exports.parseError = parseError
exports.invalidRequest = invalidRequest
exports.methodNotFound = methodNotFound
exports.serverError = serverError