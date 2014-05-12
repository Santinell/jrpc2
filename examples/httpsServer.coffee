rpc = require '../src/jrpc2.coffee'
fs = require 'fs'

server = new rpc.server

server.loadModules __dirname+'/modules/', ->
  https = new rpc.httpsTransport
    port: 8443
    key: fs.readFileSync  __dirname+'/keys/ssl-key.pem'
    cert: fs.readFileSync  __dirname+'/keys/ssl-cert.pem'
  https.listen server

