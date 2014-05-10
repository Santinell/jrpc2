JRPC2
=====

JSON-RPC 2.0 library with support of batches and named parameters


INSTALL
=====

```bash
npm install jrpc2
```

EXAMPLES
=====

Server example on coffee:

```coffeescript
rpc = require 'jrpc2'

server = new rpc.server

server.loadModules __dirname+'/modules/', ->
  http = new rpc.httpTransport { port: 8080 }
  http.listen server
```

It's very simple way to load modules. Just put in in one directory.
Example of 'users' module:

```coffeescript
users = {

  auth: (login, password) ->
    if login is 'admin' && password is 'swd'
      return 'Hello admin'
    else
      throw new Error 'Wrong login or password'

}

module.exports = users
```


Client example on coffee:

```coffeescript
rpc = require 'jrpc2'

http = new rpc.httpTransport { port: 8080, hostname: 'localhost' }
client = new rpc.client http

#single call with named parameters
client.call 'users.auth', {password: "swd", login: "admin" }, (err, raw) ->
  console.log err, raw

#single call with positional parameters
client.call 'users.auth', ["user", "pass"], (err, raw) ->
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
```
