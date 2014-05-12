rpc = require '../src/jrpc2.coffee'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0" #remove for production

https = new rpc.httpsTransport { port: 8443, hostname: 'localhost' }
client = new rpc.client https

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