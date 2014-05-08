rpcError = (message, id = 0, code = -32099) ->
  id: id
  jsonrpc: '2.0'
  error: { code: code, message: message }

module.exports = rpcError