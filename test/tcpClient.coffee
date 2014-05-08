#TODO make mocha tests of tcpClient
rpc = require '../src/jrpc2.coffee'

tcp = new rpc.tcpTransport { port: 9000 }
client = new rpc.client tcp

client.call 'users.auth', ["admin", "swd"], (err, raw) ->
  console.log err, raw

client.call 'users.auth', {login: "user", password: "pass"}, (err, raw) ->
  console.log err, raw

methods = [
  'users.auth',
  'users.auth'
]
params = [
  {login: "cozy", password: "causeBorn"},
  ["admin", "wrong"]
]
client.batch methods, params, (err, raw) ->
  console.log err, raw