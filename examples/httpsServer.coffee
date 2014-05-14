rpc = require '../src/jrpc2.coffee'
fs = require 'fs'

server = new rpc.server

server.loadModules __dirname+'/modules/', ->
  http = new rpc.httpTransport
    port: 8443
    ssl: true
    key: fs.readFileSync __dirname+'/keys/ssl-key.pem'
    cert: fs.readFileSync __dirname+'/keys/ssl-cert.pem'

  parseCookies = (headers) ->
    cookies = {}
    if headers.cookie
      for sp in headers.cookie.split('&')
        lv = sp.split("=")
        cookies[lv[0]] = lv[1]
    cookies

  server.checkAuth = (method, params, headers) ->
    if method is 'users.auth' #methods that don't require authorization
      return true
    else
      #there you can check session ID or login and password of basic auth in headers. And check whether the user has access to that method
      cookies = parseCookies(headers)
      if !cookies.sessionID || cookies.sessionID != '9037c4852fc3a3f452b1ee2b93150603'
        console.log "wrong sessionID!"
        return false
      else
        return true


  http.listen server

