zmq = require 'zmq'

class zmqTransport

  constructor: (@params) ->
    if !@params
      throw new Error 'emptyParams'

  send: (body, callback) ->
    socket = zmq.socket 'req'
    socket.connect @params.url
    socket.send JSON.stringify(body)
    socket.on 'message', (data) ->
      callback null, data

  listen: (server) ->

    socket = zmq.socket 'rep'
    socket.bind @params.url, (err) ->
      socket.on 'message', (data) ->
        server.handleRequest data.toString(), {}, (answer) ->
          #console.log data.toString()
          #console.log answer
          socket.send JSON.stringify answer


module.exports = zmqTransport