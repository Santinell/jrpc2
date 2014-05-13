http = require 'http'

class httpTransport

  constructor: (@params) ->

  send: (body, callback) ->
    @params.method = 'POST'
    req = http.request @params, (res) ->
      data = ""
      res.on 'data', (chunk) ->
        data += chunk
      res.on 'end', ->
        callback null, data
      res.on 'error', (e) ->
        callback e, null
    req.write JSON.stringify body
    req.end()


  listen: (server) ->
    httpServer = http.createServer (req, res) ->
      data = ""
      req.on 'data', (chunk) ->
        data += chunk
      req.on 'end', ->
        server.handleRequest data, (answer) ->
          #console.log data
          #console.log JSON.stringify answer
          res.writeHead 200, {'Content-Type': 'application/json'}
          res.write JSON.stringify answer
          res.end()

    if @params.websocket
      websocket = require 'websocket-driver'
      httpServer.on 'upgrade', (request, socket, body) ->
        if not websocket.isWebSocket request
          return
        driver = websocket.http request
        driver.io.write body
        socket.pipe(driver.io).pipe socket
        driver.messages.on 'data', (data) ->
          server.handleRequest data, (answer) ->
            driver.text JSON.stringify answer
            #console.log data
            #console.log JSON.stringify answer
        driver.start()

    httpServer.listen @params.port


module.exports = httpTransport