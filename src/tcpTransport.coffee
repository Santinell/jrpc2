net = require 'net'
#TODO add more event handlers
class tcpTransport

  constructor: (@params) ->

  send: (body, callback) ->
    client = net.connect @params, ->
      client.write body
    client.on 'data', (data) ->
      callback null, data.toString()
      client.end() #TODO make it optional - close or not connection

  listen: (server) ->
    tcp = net.createServer (socket) ->
      socket.on 'data', (data)->
        #console.log data.toString()
        server.handleRequest data, (answer) ->
          #console.log answer
          socket.write JSON.stringify(answer)

    tcp.listen @params.port


module.exports = tcpTransport