WebSocket = require 'ws'

class wsTransport

  constructor: (@params) ->
    if !@params
      throw new Error 'emptyParams'
    
    @httpParams = @params.http or {}
    @wsParams = @params.ws or {}
    
    @http = if @httpParams.ssl then require('https') else require('http')

  send: (body, callback) ->
    ws = new WebSocket @params.url

    ws.on 'open', () ->
      ws.send JSON.stringify body
    
    ws.on 'error', (e) ->
      callback e, null if callback
    
    ws.on 'message', (data) ->
      callback null, data.toString() if callback
      ws.close()

  close: () ->
    if @httpServer.close()
      @httpServer.close()

  httpHandler: (req, res) ->
    res.end()

  listen: (server) ->
    @wsParams.noServer = true;
    @wsServer = new WebSocket.Server @wsParams

    @wsServer.on 'connection', (ws, request) ->
      client_ip = request.headers['x-forwarded-for'] || request.connection.remoteAddress || '127.0.0.1'
      client_ip = client_ip.replace('::ffff:', '')

      ws.on 'message', (data) ->
        server.handleCall data.toString(), { client_ip }, (answer) ->
          ws.send JSON.stringify answer if answer        

    if @params.ssl
      @httpServer = @http.createServer @httpParams, @httpHandler
    else
      @httpServer = @http.createServer @httpHandler

    @httpServer.on 'upgrade', (request, socket, head) => 

      @wsServer.handleUpgrade request, socket, head, (ws) =>
        @wsServer.emit('connection', ws, request)

    @httpServer.listen @params.port


module.exports = wsTransport
