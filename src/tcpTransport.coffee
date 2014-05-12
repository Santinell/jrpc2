net = require 'net'

class tcpTransport

  constructor: (@params) ->

  send: (body, callback) ->
    client = net.connect @params, ->
      client.write JSON.stringify body
    client.on 'error', (e) -> callback e, null
    client.on 'timeout', ->
      callback new Error('TimeoutError'), null
      client.end()
    client.on 'data', (data) ->
      callback null, data.toString()
      client.end()

  listen: (server) ->
    tcpServer = net.createServer (socket) ->
      socket.on 'data', (data)->
        #console.log data.toString()
        server.handleRequest data, (answer) ->
          #console.log answer
          socket.write JSON.stringify answer
    tcpServer.listen @params.port


module.exports = tcpTransport