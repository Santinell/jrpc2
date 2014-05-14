class httpTransport

  constructor: (@params) ->
    @http = if @params.ssl then require('https') else require('http')

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
    req.write JSON.stringify body
    req.end()



  listen: (server) ->

    listener = (req, res) ->
      data = ""
      req.on 'data', (chunk) ->
        data += chunk
      req.on 'end', ->
        server.handleRequest data, req.headers, (answer) ->
          #console.log data
          #console.log JSON.stringify answer
          res.writeHead 200, {'Content-Type': 'application/json'}
          res.write JSON.stringify answer
          res.end()

    if @params.ssl
      httpServer = @http.createServer @params, listener
    else
      httpServer = @http.createServer listener

    if @params.websocket
      WebSocketServer = require('ws').Server;
      wss = new WebSocketServer({ server: httpServer });
      wss.on 'connection', (wsConnect) ->
        wsConnect.on 'message', (data) ->
          server.handleRequest data, wsConnect.upgradeReq.headers, (answer) ->
            #console.log data
            #console.log JSON.stringify answer
            wsConnect.send JSON.stringify answer

    httpServer.listen @params.port


module.exports = httpTransport