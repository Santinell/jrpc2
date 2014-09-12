rpc = require "jrpc2"
http = require "http"
app = require("express")()
server = new rpc.server()
httpServer = http.createServer(app)
io = require("socket.io")(httpServer)

server.exposeModule 'math', {
  log: (num, base) -> Math.log(num)/Math.log(base)
  sum: (a,b) -> a+b
}

app.use '/api', rpc.middleware server
io.use rpc.wsMiddleware server

httpServer.listen 8080