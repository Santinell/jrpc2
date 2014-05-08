#TODO make mocha tests of tcpClient
rpc = require '../src/jrpc2.coffee'

tcp = new rpc.tcpTransport { port: 9000 }
client = new rpc.client tcp

client.call 'users.auth', ["user", "pass"], (err, raw) ->
  console.log err, raw

methods = [
  'users.auth',
  'users.auth'
]
params = [
  ["admin", "swd"],
  {login: "cozy", password: "causeBorn"}
]
client.batch methods, params, (err, raw) ->
  console.log err, raw