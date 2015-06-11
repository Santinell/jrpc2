module.exports = (server) ->
  (socket, next) ->
    socket.on "message", (data) ->
      req = socket.request
      req.client_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '127.0.0.1'
      req.client_ip = req.client_ip.replace('::ffff:', '')
      server.handleCall data, req, (answer) ->
        socket.send JSON.stringify answer
    next()
