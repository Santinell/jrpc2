JRPC2
=====

JSON-RPC 2.0 library with support of batches and named parameters.

Simple loading of modules.

You can use http (including websocket), https, tcp transport for your server and client.


INSTALL
=====

```bash
npm install jrpc2
```

EXAMPLES
=====

Server example:

```javascript
  var rpc = require('jrpc2');

  var server = new rpc.server;

  server.loadModules(__dirname + '/modules/', function() {
    var http = new rpc.httpTransport({ port: 8080 });
    http.listen(server);
  });
```

It's very simple way to load modules. Just put it in one directory.

Example of 'users' module (./modules/users.js in this example):

```javascript
  var users = {
    auth: function(login, password) {
      if (login === 'admin' && password === 'swd') {
        return 'Hello admin';
      } else {
        throw new Error('Wrong login or password');
      }
    }
  };

  module.exports = users;
```

Client example:

```javascript
  var rpc = require('jrpc2');

  var http = new rpc.httpTransport({ port: 8080, hostname: 'localhost' });

  var client = new rpc.client(http);

  //single call with named parameters
  client.call('users.auth', { password: "swd", login: "admin" }, function(err, raw) {
    console.log(err, raw);
  });

  //single call with positional parameters
  client.call('users.auth', ["user", "pass"], function(err, raw) {
    console.log(err, raw);
  });

  //methods and parameters for batch call
  var methods = ["users.auth",  "users.auth"]
  var params = [
    {login: "cozy", password: "causeBorn"},
    ["admin", "wrong"]
  ]
  client.batch(methods, params, function(err, raw) {
    console.log(err, raw);
  });
```

