rpc = require "../src/jrpc2"
app = require("express")()
rpcServer = new rpc.server()

rpcServer.exposeModule 'math', {
  log: (num, base) -> Math.log(num)/Math.log(base)
  sum: (a,b) -> a+b
}

app.use '/api', rpc.middleware rpcServer
app.listen 80



