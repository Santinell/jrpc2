rpc = require '../src/jrpc2.coffee'
fs = require 'fs'

server = new rpc.server

server.loadModules __dirname+'/modules/', ->
  http = new rpc.httpTransport
    port: 8443
    ssl: true
    key: fs.readFileSync  __dirname+'/keys/ssl-key.pem'
    cert: fs.readFileSync  __dirname+'/keys/ssl-cert.pem'
  server.checkAuth = (method, params, headers) ->
    console.log method, params, headers
    if method is 'users.auth' #methods that don't require authorization
      return true
    else
      #there you can check sessionID or login and password of basic auth in headers. And check whether the user has access to that method
  http.listen server

