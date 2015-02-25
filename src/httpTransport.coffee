rpc = require './jrpc2'

class httpTransport

  constructor: (@params) ->
    if !@params
      throw new Error 'emptyParams'
    @http = if @params.ssl then require('https') else require('http')

  setHeader: (name, value) ->
    if !@params.headers
      @params.headers = {}
    @params.headers[name] = value;

  removeHeader: (name) ->
    delete @params.headers[name]

  send: (body, callback) ->
    @params.method = 'POST'
    req = @http.request @params, (res) ->
      data = ""
      res.on 'data', (chunk) ->
        data += chunk
      res.on 'end', ->
        if callback
          callback null, data
      res.on 'error', (e) ->
        if callback
          callback e, null
    req.end JSON.stringify(body)


  close: () ->
    if @httpServer
      @httpServer.close()

  listen: (server) ->
    listener = rpc.httpListener server
    if @params.ssl
      @httpServer = @http.createServer @params, listener
    else
      @httpServer = @http.createServer listener
    @httpServer.listen @params.port

module.exports = httpTransport
