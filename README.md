jrpc2
=====

JSON-RPC 2.0 library with support of batches and named parameters


INSTALL
=====

npm install jrpc2


USING
=====

Server example on coffee:

rpc = require 'jrpc2'

server = new rpc.server

server.loadModules __dirname+'/modules/', ->
  http = new rpc.httpTransport { port: 8080 }
  http.listen server


Client example on coffee:

rpc = require '../src/jrpc2.coffee'

http = new rpc.httpTransport { uri: 'http://localhost:8080/' }
client = new rpc.client http

#single call with positional parameters
client.call 'users.auth', ["admin", "swd"], (err, raw) ->
  console.log err, raw

#single call with named parameters
client.call 'users.auth', {password: "pass", login: "user"}, (err, raw) ->
  console.log err, raw

#methods and parameters for batch call
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