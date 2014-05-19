rpc = require '../src/jrpc2'

server = new rpc.server

server.expose 'sum', (a,b) ->  a+b

http = new rpc.httpTransport { port: 8080, websocket: true }
http.listen server

