rpc = require '../src/jrpc2.coffee'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0" #remove for production

https = new rpc.httpTransport { port: 8443, hostname: 'localhost', ssl: true }
client = new rpc.client https

client.call 'users.auth', ["user", "pass"], (err, raw) ->
  console.log err, raw

methods = ['users.auth', 'users.auth']
params = [
  {login: "cozy", password: "causeBorn"},
  ["admin", "wrong"]
]
client.batch methods, params, (err, raw) ->
  console.log err, raw

client.call 'users.auth', {password: "swd", login: "admin" }, (err, raw) ->
  obj = JSON.parse raw
  if obj.result
    https.setHeader 'Cookie', 'sessionID='+obj.result.sessionID
    client.notify 'logs.userLogout', {timeOnSite: 364, lastPage: '/price'}