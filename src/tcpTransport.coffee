net = require 'net'

class tcpTransport

  constructor: (@params) ->

  send: (body, callback) ->
    client = net.connect @params, ->
      client.write JSON.stringify body
    client.on 'error', (e) ->
      if callback
        callback e, null
    client.on 'timeout', ->
      if callback
        callback new Error('TimeoutError'), null
      client.end()
    client.on 'data', (data) ->
      if callback
        callback null, data.toString()
      client.end()

  listen: (server) ->
    tcpServer = net.createServer (socket) ->
      socket.on 'error', -> socket.end()
      socket.on 'data', (data)->
        server.handleRequest data, {}, (answer) ->
          #console.log data.toString()
          #console.log answer
          socket.write JSON.stringify answer
    tcpServer.listen @params.port


module.exports = tcpTransport