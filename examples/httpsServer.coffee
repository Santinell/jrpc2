rpc = require '../src/jrpc2'
app = require("express")()
rpcServer = new rpc.server()
fs = require 'fs'
url = require 'url'
https = require 'https'

params = {
  port: 8443
  ssl: true
  key: fs.readFileSync __dirname + '/../test/keys/ssl-key.pem'
  cert: fs.readFileSync __dirname + '/../test/keys/ssl-cert.pem'
}

httpsServer = https.createServer params, app

rpcServer.loadModules __dirname+'/../test/modules/', ->

  rpcServer.checkAuth = (method, params, headers) ->
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

  app.use '/api', rpc.middleware rpcServer

  httpsServer.listen()

