class client

  constructor: (@transport) ->

  id: 0

  request: (method, params) ->
    @id++
    return {
      id: @id
      method: method
      params: params
      jsonrpc: '2.0'
    }

  batch: (methods, params, callback) ->
    req = []
    for method, i in methods
      req.push @request method, params[i]
    #console.log req
    @transport.send req, callback

  call: (method, params, callback) ->
    req = @request method, params
    #console.log req
    @transport.send req, callback


module.exports = client