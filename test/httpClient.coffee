#TODO make mocha tests of httpClient
rpc = require '../src/jrpc2.coffee'

http = new rpc.httpTransport { uri: 'http://localhost:8080/' }
client = new rpc.client http

#client.call 'users.auth', ["admin", "swd"], (err, res, raw) ->
#  console.log err, raw

#client.call 'users.auth', {login: "cozy", password: "osborn"}, (err, res, raw) ->
#  console.log err, raw

methods = [
  'users.auth',
  'users.auth'
]
params = [
  ["admin", "swd"],
  {login: "cozy", password: "osborn"}
]
client.batch methods, params, (err, res, raw) ->
  console.log err, raw