http = require 'http'
#TODO: add support of websocket
class httpTransport

  constructor: (@params) ->

  send: (body, callback) ->
    @params.method = 'POST'
    req = http.request @params, (res) ->
      data = ""
      res.on 'data', (chunk) -> data += chunk
      res.on 'end', -> callback null, data
      res.on 'error', (e) -> callback e, null
    req.write JSON.stringify body
    req.end()


  listen: (server) ->

    (http.createServer (req, res) ->
      data = ""
      req.on 'data', (chunk) -> data += chunk
      req.on 'end', ->
        server.handleRequest data, (answer) ->
          console.log data
          console.log JSON.stringify answer
          res.writeHead 200, {'Content-Type': 'application/json'}
          res.write JSON.stringify answer
          res.end()
    ).listen @params.port

module.exports = httpTransport