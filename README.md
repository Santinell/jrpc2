JRPC2
=====

JSON-RPC 2.0 library with support of batches and named parameters.

Simple loading of modules.

You can use http, https, ws, wss, tcp protocols for your server and client.


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
    var http = new rpc.httpTransport({ port: 8080, websocket: true });
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

  //for https set parameter ssl: true
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
  var methods = ["users.auth",  "users.auth"];
  var params = [
    {login: "cozy", password: "causeBorn"},
    ["admin", "wrong"]
  ];
  client.batch(methods, params, function(err, raw) {
    console.log(err, raw);
  });
```


Complex example of https server with checkAuth and change of context:

(This is schematic example, so i don't test it)
```javascript

var rpc = require('jrpc2');
var url = require('url');
var mongo = require('mongodb').MongoClient;
var server = new rpc.server();

server.loadModules(__dirname + '/modules/', function() {
    var https = new rpc.httpTransport({
      port: 8443,
      ssl: true,
      key: fs.readFileSync(__dirname + '/keys/ssl-key.pem'),
      cert: fs.readFileSync(__dirname + '/keys/ssl-cert.pem')
    });
    mongo.connect('mongodb://127.0.0.1:27017/test', function(err, db) {
        var app = {};
        app.mongo = mongo;
        app.db = db;
        server.checkAuth = function(method, params, headers) {
            var cookies;
            if (method === 'users.auth') {//for methods that don't require authorization
                return true;
            } else {
                //there you can check session ID or login and password of basic auth in headers. And check whether the user has access to that method
                if (!app.user) {
                    cookies = url.parse('?' + (headers.cookie || ''), true).query;
                    var sessionID = cookies.sessionID || '';
                    var usersCollection = db.collection('users');
                    app.user = usersCollection.findOne({session_id: sessionID});
                    if (!app.user) //user not found
                        return false;
                }
                //check permissions
                var permissionsCollection = db.collection('permissions');
                access = permissionsCollection.findOne({role: app.user.role, method: method});
                if (access)
                    return true;
                else
                    return false;
            }
        }
        //There we set context
        server.context = app;
        https.listen(server);
    });

});
```

And now you can use context in your modules:

```javascript
  var logs = {
    userLogout: function(timeOnSite, lastPage) {
        var logsCollection = this.db.collection('logs'); //this.db from context of app
        logsCollection.insert({userId: this.user.userId, time: timeOnSite, lastPage: lastPage}, ); //this.user from context of app
    }
  };

  module.exports = logs;
```

Https client with auth and notification:

```javascript
  var rpc = require('jrpc2');

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; //ignore self-signed sertificate, remove for production

  var https = new rpc.httpTransport({ port: 8443, hostname: 'localhost', ssl: true });
  var client = new rpc.client(https);

  client.call('users.auth', { password: "swd", login: "admin" }, function(err, raw) {
    var obj = JSON.parse(raw);
    if (obj.error) {
        console.log(obj.error.description);
    } else { //successful auth
      http.setHeader('Cookie', 'sessionID=' + obj.result.sessionID);
      client.notify('logs.userLogout', { timeOnSite: 364, lastPage: '/price' });
    }
  });
```