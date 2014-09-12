class client

  id: 0

  constructor: (@transport) ->
    if !@transport
      throw new Error 'emptyTransport'

  request: (method, params, setId = true) ->
    req = {
      method: method
      params: params
      jsonrpc: '2.0'
    }
    if setId
      req.id = ++@id
    req

  notify: (method, params = []) ->
    req = @request method, params, false
    @transport.send req
    true

  batch: (methods, params, callback) ->
    req = []
    for method, i in methods
      req.push @request method, params[i]
    @transport.send req, callback

  call: (method, params, callback) ->
    req = @request method, params
    @transport.send req, callback


module.exports = client