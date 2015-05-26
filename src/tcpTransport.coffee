net = require 'net'

class tcpTransport

  constructor: (@params) ->
    if !@params
      throw new Error 'emptyParams'

  send: (body, callback) ->
    client = net.connect @params, ->
      client.write JSON.stringify body
    client.on 'error', (e) ->
      callback e, null if callback
    client.on 'timeout', ->
      callback new Error('TimeoutError'), null if callback
      client.end()
    client.on 'data', (data) ->
      callback null, data.toString() if callback
      client.end()

  close: () ->
    if @tcpServer
      @tcpServer.close()

  listen: (server) ->
    @tcpServer = net.createServer (socket) ->
      socket.on 'error', -> socket.end()
      socket.on 'data', (data) ->
        ip = socket.remoteAddress?.replace('::ffff:', '')
        server.handleCall data.toString(), {client_ip: ip}, (answer) ->
          socket.write JSON.stringify answer if answer
    if @params.path?
      @tcpServer.listen @params.path
    else
      @tcpServer.listen @params.port


module.exports = tcpTransport
