rpc = require '../src/jrpc2.coffee'
fs = require 'fs'

server = new rpc.server

server.loadModules __dirname+'/modules/', ->
  http = new rpc.httpTransport
    port: 8443
    ssl: true
    key: fs.readFileSync  __dirname+'/keys/ssl-key.pem'
    cert: fs.readFileSync  __dirname+'/keys/ssl-cert.pem'
  http.listen server

