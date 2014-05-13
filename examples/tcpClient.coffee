rpc = require '../src/jrpc2.coffee'

tcp = new rpc.tcpTransport { port: 9000, host: 'localhost' }
client = new rpc.client tcp

client.call 'users.auth', {password: "swd", login: "admin" }, (err, raw) ->
  console.log err, raw

client.call 'users.auth', ["user", "pass"], (err, raw) ->
  console.log err, raw

methods = ['users.auth',  'users.auth']
params = [
  {login: "cozy", password: "causeBorn"},
  ["admin", "wrong"]
]
client.batch methods, params, (err, raw) ->
  console.log err, raw