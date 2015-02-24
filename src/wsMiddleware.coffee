module.exports = (server) ->
  (socket, next) ->
    socket.on "message", (data) ->
      req = socket.request
      req.client_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
      server.handleCall data, req, (answer) ->
        socket.send JSON.stringify answer
    next()
