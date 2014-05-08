net = require 'net'
#TODO add more event handlers
class tcpTransport

  constructor: (@params) ->

  #TODO rewrite for keep connecting between requests
  send: (body, callback) ->
    client = net.connect @params, ->
      client.write body
    client.on 'data', (data) ->
      callback null, data.toString()
      client.end()

  listen: (server) ->
    tcp = net.createServer (socket) ->
      socket.on 'data', (data)->
        #console.log data.toString()
        server.handleRequest data, (answer) ->
          #console.log answer
          socket.write JSON.stringify(answer)

    tcp.listen @params.port


module.exports = tcpTransport