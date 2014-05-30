rpc = require '../src/jrpc2'

http = new rpc.httpTransport { port: 8080, hostname: '188.226.169.108' }
client = new rpc.client http

client.call 'math.sum', [6, 12], (err, raw) ->
  console.log err, raw

client.call 'math.log', [10, 12], (err, raw) ->
  console.log err, raw

client.notify 'console', ["Hello server"]
