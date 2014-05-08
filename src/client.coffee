class client

  constructor: (@transport) ->

  id: 0

  batch: (methods, params, callback) ->
    request = []
    for method, i in methods
      @id++
      request.push
        id: @id
        method: method
        params: params[i]
        jsonrpc: '2.0'
    console.log request
    @transport.send JSON.stringify(request), callback

  call: (method, params, callback) ->
    @id++
    request =
      id: @id
      method: method
      params: params
      jsonrpc: '2.0'
    @transport.send JSON.stringify(request), callback



module.exports = client