rpc = require '../src/jrpc2'
server = new rpc.server

server.expose 'console', (message) -> console.log message

server.exposeModule 'math', {
  log: (num, base) -> Math.log(num)/Math.log(base)
  sum: (a,b) -> a+b
}

http = new rpc.httpTransport { port: 8080, websocket: true }
http.listen server

