http = require 'http'

class httpTransport

  constructor: (@params) ->

  send: (body, callback) ->
    options = @params
    options.method = 'POST'
    req = http.request options, (res) ->
      data = ""
      res.on 'data', (chunk) -> data += chunk
      res.on 'end', -> callback null, data
      res.on 'error', (e) -> callback e, null
    req.write(body);
    req.end()


  listen: (server) ->

    (http.createServer (req, res) ->
      data = ""
      req.on 'data', (chunk) -> data += chunk
      req.on 'end', ->
        #console.log data
        server.handleRequest data, (answer) ->
          #console.log answer
          res.writeHead 200, {'Content-Type': 'application/json'}
          res.write JSON.stringify(answer)
          res.end()
    ).listen @params.port

module.exports = httpTransport