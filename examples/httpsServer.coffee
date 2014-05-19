rpc = require '../src/jrpc2'
fs = require 'fs'
url = require 'url'

server = new rpc.server

server.loadModules __dirname+'/../test/modules/', ->
  https = new rpc.httpTransport
    port: 8443
    ssl: true
    key: fs.readFileSync __dirname+'/../test/keys/ssl-key.pem'
    cert: fs.readFileSync __dirname+'/../test/keys/ssl-cert.pem'

  server.checkAuth = (method, params, headers) ->
    if method is 'users.auth' #methods that don't require authorization
      return true
    else
      #there you can check session ID or login and password of basic auth in headers. And check whether the user has access to that method
      cookies = url.parse('?'+(headers.cookie || ''), true).query
      if !cookies.sessionID || cookies.sessionID != '9037c4852fc3a3f452b1ee2b93150603'
        console.log "wrong sessionID!"
        return false
      else
        return true


  https.listen server

