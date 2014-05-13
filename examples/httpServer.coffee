rpc = require '../src/jrpc2.coffee'

server = new rpc.server

server.loadModules __dirname+'/modules/', ->
  http = new rpc.httpTransport { port: 8080, websocket: true }
  http.listen server

