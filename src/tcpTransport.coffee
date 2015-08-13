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
      receiveString = ""
      timerknock = null

      socket.on 'error', -> socket.end()
      socket.on 'data', (data) ->
        ip = socket.remoteAddress || '127.0.0.1'
        ip = ip.replace('::ffff:', '')
        receiveString = receiveString + data.toString("utf8")
        try
          jsonObject = JSON.parse(receiveString)
          receiveString = "";
          clearTimeout(timerknock)
          timerknock = null
          server.handleCall jsonObject, {client_ip: ip}, (answer) ->
            socket.write JSON.stringify answer if answer
        catch
          if timerknock == null
            timerknock = setTimeout(() ->
              console.log("Timeout, reset receive String to 0")
              timerknock = null
              receiveString = "";
            , 1000)

    if @params.path?
      @tcpServer.listen @params.path
    else
      @tcpServer.listen @params.port


module.exports = tcpTransport
