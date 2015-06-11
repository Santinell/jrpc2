exports.httpListener = httpListener = (server) ->
  (req, res) ->
    data = ""
    req.on 'data', (chunk) ->
      data += chunk
    req.on 'end', ->
      req.client_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
      req.client_ip = req.client_ip.replace('::ffff:', '')
      server.handleCall data, req, (answer) ->
        if answer
          res.writeHead 200, {'Content-Type': 'application/json'}
          res.write JSON.stringify answer
        res.emit 'close'
        res.end()

exports.middleware = (server) ->
  listener = httpListener server
  (req, res, next) ->
    if req.method is 'POST'
      listener req, res
    else
      next()
