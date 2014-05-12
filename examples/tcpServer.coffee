rpc = require '../src/jrpc2.coffee'

server = new rpc.server

server.loadModules __dirname+'/modules/', ->
  http = new rpc.tcpTransport { port: 9000 }
  http.listen server