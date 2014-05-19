rpc = require '../src/jrpc2'

http = new rpc.httpTransport { port: 8080, hostname: 'localhost' }
client = new rpc.client http

client.call 'sum', [6, 12], (err, raw) ->
  console.log err, raw