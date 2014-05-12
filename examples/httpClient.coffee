rpc = require '../src/jrpc2.coffee'

http = new rpc.httpTransport { port: 8080, hostname: 'localhost' }
client = new rpc.client http

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