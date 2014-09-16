module.exports = (server) ->
  (socket, next) ->
    socket.on "message", (data) ->
      req = socket.request
      if req.cookies
        req.headers.cookies = req.cookies
      req.headers.ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
      server.handleRequest data, req.headers, (answer) ->
        socket.send JSON.stringify answer
    next()