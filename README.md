[![Build Status](https://travis-ci.org/Santinell/jrpc2.svg?branch=master)](https://travis-ci.org/Santinell/jrpc2) [![Coverage Status](https://coveralls.io/repos/Santinell/jrpc2/badge.png)](https://coveralls.io/r/Santinell/jrpc2)

![NPM Info](https://nodei.co/npm/jrpc2.png?downloads=true)
JRPC2
=====

JSON-RPC 2.0 library with support of batches and named parameters.

Simple loading of modules.

You can use **HTTP**, **HTTPS**, **WebSocket**, **WebSocket Secure**, **TCP** protocols for your server and client.

Extend your method's scope by change context of server.


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

  server.loadModules(__dirname + '/modules/', function () {
    var http = new rpc.httpTransport({port: 8080, websocket: true});
    http.listen(server);
  });
```

It's very simple way to load modules. Just put it in one directory.

Example of 'logs' module (./modules/logs.js in this example):

```javascript

  var logs = {
    userLogout: function (timeOnSite, lastPage) {
        var coll = this.db.collection('logs');
        coll.insert({userId: this.user.userId, time: timeOnSite, lastPage: lastPage});
    }
  };

  module.exports = logs;
```

Client example:

```javascript
  var rpc = require('jrpc2');

  var http = new rpc.httpTransport({port: 8080, hostname: 'localhost'});

  var client = new rpc.client(http);

  //single call with named parameters
  client.call('users.auth', {password: "swd", login: "admin"}, function (err, raw) {
    console.log(err, raw);
  });

  //single call with positional parameters
  client.call('users.auth', ["user", "pass"], function (err, raw) {
    console.log(err, raw);
  });

  //methods and parameters for batch call
  var methods = ["users.auth",  "users.auth"];
  var params = [
    {login: "cozy", password: "causeBorn"},
    ["admin", "wrong"]
  ];
  client.batch(methods, params, function (err, raw) {
    console.log(err, raw);
  });
```


Complex example of https server with checkAuth and change of context:

```javascript

var rpc = require('jrpc2');
var url = require('url');
var mongoose = require('mongoose');
var server = new rpc.server();

server.loadModules(__dirname + '/modules/', function () {
    var https = new rpc.httpTransport({
      port: 8443,
      ssl: true,
      key: fs.readFileSync(__dirname + '/keys/ssl-key.pem'),
      cert: fs.readFileSync(__dirname + '/keys/ssl-cert.pem')
    });
    mongoose.connect('mongodb://127.0.0.1:27017/test', function (err, db) {
        //this is our new context
        var app = {};
        app.mongoose = mongoose;
        app.db = db;
        //there you can check session ID or login and password of basic auth in headers.
        //And check whether the user has access to that method
        server.checkAuth = function (method, params, headers) {
            if (method === 'users.auth') {//for methods that don't require authorization
                return true;
            } else {
                if (!app.user) {
                    var cookies = url.parse('?' + (headers.cookie || ''), true).query;
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

And now you can use context in your modules (for async methods you can use promises):

```javascript

  var users = {
    auth: function(login, password) {
      //this.mongoose and this.db from context
      var promise = new this.mongoose.Promise();
      var coll = this.db.collection('users');
      coll.findOne({login: login, password: password}, function(err, user) {
        if (err)
          throw new Error('Wrong login or password');
        return promise.resolve(user);
      });
      return promise;
    }
  };

  module.exports = users;
```

Https client with auth and notification:

```javascript
  var rpc = require('jrpc2');

  //ignore self-signed sertificate, remove for production
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

  var https = new rpc.httpTransport({port: 8443, hostname: 'localhost', ssl: true});
  var client = new rpc.client(https);

  client.call('users.auth', {password: "swd", login: "admin"}, function (err, raw) {
    var obj = JSON.parse(raw);
    if (obj.error) {
        console.log(obj.error.description);
    } else { //successful auth
      https.setHeader('Cookie', 'sessionID=' + obj.result.sessionID);
      client.notify('logs.userLogout', {timeOnSite: 364, lastPage: '/price'});
    }
  });
```