abstract = (message, code = -32099, id = null) ->
  id: id
  jsonrpc: '2.0'
  error: { code: code, message: message }

parseError = (id = null) ->
  abstract 'ParseError', -32700, id

invalidRequest = (id = null) ->
  abstract 'InvalidRequest', -32600, id

methodNotFound = (id = null) ->
  abstract 'MethodNotFound', -32601, id

invalidParams = (id = null) ->
  abstract 'InvalidParams', -32602, id

exports.abstract = abstract
exports.parseError = parseError
exports.invalidRequest = invalidRequest
exports.methodNotFound = methodNotFound
exports.invalidParams = invalidParams