[![Build Status](https://travis-ci.org/Santinell/jrpc2.svg?branch=master)](https://travis-ci.org/Santinell/jrpc2) [![Coverage Status](https://coveralls.io/repos/Santinell/jrpc2/badge.png)](https://coveralls.io/r/Santinell/jrpc2)

![NPM Info](https://nodei.co/npm/jrpc2.png?downloads=true)
JRPC2
=====

JSON-RPC 2.0 library with support of batches and named parameters.

Supported protocols:
+ **HTTP(S)** + **WebSocket**, **WebSocket Secure**
+ **TCP**
+ **ZeroMQ** [Santinell/zmqTransport](https://github.com/Santinell/zmqTransport)
+ **Express/Connect** middleware.

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

Example of 'math' module (./modules/math.js in this example):

```javascript

  var math = {
    sum: function () {
      var sum = 0;
      for (var key in arguments) {
        sum+=arguments[key];
      }
      return sum;
    },
    log: function (num, base) {
      return Math.log(num)/Math.log(base);
    }
  };

  module.exports = math;
```

If you want you can manual expose your methods and modules.
For async methods you can use promises.

```javascript
  var fs = require('fs');
  
  //lib for promises
  var Q = require('q');

  server.expose('sayHello',function(){
    return "Hello!";
  });  
 
  server.exposeModule('fs',{    
    readFile: function (file) {
      var deferred = Q.defer();
      fs.readFile(file, "utf-8", function (error, text) {
          if (error) {
              deferred.reject(new Error(error));
          } else {
              deferred.resolve(text);
          }
      });
      return deferred.promise;
    },
    writeFile: function (file, data) {
      var deferred = Q.defer();
      fs.writeFile(file, data, "utf-8", function (error) {
          if (error) {
              deferred.reject(new Error(error));
          } else {
              deferred.resolve(true);
          }
      });
      return deferred.promise;
    }
  });
```

For extending methods scope you can set server context.
By default context already extended by headers.

```javascript
  ...
  var mongoose = require('mongoose');

  server.loadModules(__dirname + '/modules/', function () {
    mongoose.connect('mongodb://127.0.0.1:27017/test', function (err, db) {
      server.context.mongoose = mongoose;
      server.context.db = db;   
      ...
    }
  }
```

And then use this.* in methods:

```javascript

  server.exposeModule('logs', {    
    loginBruteForce: function () {
      //this.db from server.context
      var logs = this.db.collection('logs');
      //this.ip from headers
      logs.save({ip: this.ip, addTime: new Date(), text: "Brute force of login form"});
    }
  });
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

Using as Express/Connect middleware:

```javascript

var rpc = require('jrpc2');
var express = require('express');
var server = new rpc.server();
var app = express();

server.loadModules(__dirname + '/modules/', function () {
  app.use(rpc.middleware(server));  
  app.listen(80);
});

```

For support ssl and websocket you can use Express/Connect with httpTransport:

```javascript

var rpc = require('jrpc2');
var express = require('express');
var server = new rpc.server();
var app = express();

server.loadModules(__dirname + '/modules/', function () {
  app.use(rpc.middleware(server)); 
  var https = new rpc.httpTransport({
    framework: app,
    port: 443,
    websocket: true,
    ssl: true,
    key: fs.readFileSync(__dirname + '/keys/ssl-key.pem'),
    cert: fs.readFileSync(__dirname + '/keys/ssl-cert.pem')
  });
  https.listen(server);
});

```
