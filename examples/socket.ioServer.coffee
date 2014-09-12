rpc = require '../src/jrpc2'
server = new rpc.server
socketio = require "socket.io"

server.expose 'console', (message) -> console.log message

server.exposeModule 'math', {
  log: (num, base) -> Math.log(num)/Math.log(base)
  sum: (a,b) -> a+b
}

http = new rpc.httpTransport { port: 8080, socketio: socketio }
http.listen server