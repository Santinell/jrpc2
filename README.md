[![Build Status](https://travis-ci.org/Santinell/jrpc2.svg?branch=master)](https://travis-ci.org/Santinell/jrpc2) [![Coverage Status](https://coveralls.io/repos/Santinell/jrpc2/badge.png)](https://coveralls.io/r/Santinell/jrpc2)

![NPM Info](https://nodei.co/npm/jrpc2.png?downloads=true)

JRPC2
======

[![Join the chat at https://gitter.im/Santinell/jrpc2](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/Santinell/jrpc2?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

JSON-RPC 2.0 library with support of batches and named parameters.

Middlewares:
+ **Koa** [Santinell/koa-jrpc2](https://github.com/Santinell/koa-jrpc2)
+ **Express**
+ **Socket.IO**

Transports:
+ **HTTP**
+ **TCP**
+ **ZeroMQ** [Santinell/zmqTransport](https://github.com/Santinell/zmqTransport)


INSTALL
=======

```bash
npm install jrpc2
```

SERVER EXAMPLES
===============

Using with Koa as middleware:

```javascript

var rpc = require('jrpc2');
var koaMiddleware = require('koa-jrpc2');
var route = require('koa-route');
var app = require('koa')();
var rpcServer = new rpc.Server();

rpcServer.loadModules(__dirname + '/modules/', function () {
    app.use(route.post('/api', koaMiddleware(rpcServer)));
    app.listen(80);
});

```

Using with Express as middleware:

```javascript

var rpc = require('jrpc2');
var app = require('express')();
var rpcServer = new rpc.Server();

rpcServer.loadModules(__dirname + '/modules/', function () {
  app.post('/api', rpc.middleware(rpcServer));
  app.listen(80);
});

```

Using with Socket.IO and Express middlewares:

```javascript

var rpc = require('jrpc2');
var http = require('http');
var app = require('express')();
var rpcServer = new rpc.Server();
var httpServer = http.createServer(app);
var io = require('socket.io')(httpServer);

rpcServer.loadModules(__dirname + '/modules/', function () {
  app.post('/api', rpc.middleware(rpcServer));
  io.use(rpc.wsMiddleware(rpcServer));
  httpServer.listen(80);
});

```

JSON-RPC modules loaded automatically. Just put it in one directory.

Example of 'math' module with no submodules (./modules/math.js in this example):

```javascript
module.exports = {
  add: function (a, b) {
    return Promise.resolve(a + b);
  },
  pow: function (a, b) {
    return Promise.resolve(Math.pow(a, b));
  }
}
```

Example of 'math' module using submodules (Also ./modules/math.js):

```javascript

  module.exports = {
    arithmetic: {
      sum: function () {
        var sum = 0;
        for (var key in arguments) {
          sum+=arguments[key];
        }
        return Promise.resolve(sum);
      },
      product: function () {
        var product = 1;
        for (var key in arguments) {
          sum *= arguments[key];
        }
        return Promise.resolve(product);
      }
    },
    exponential: {
      log: function (num, base) {
        return Promise.resolve(Math.log(num)/Math.log(base));
      },
      pow: function (base, power) {
        return promise.resolve(Math.pow(base, power));
      }
    }
  };
```

If you want you can manual load your methods and modules.

```javascript
  ...
  var rpcServer = new rpc.Server();
  var fs = require('fs');

  rpcServer.expose('sayHello',function(){
    return Promise.resolve("Hello!");
  });

  rpcServer.exposeModule('fs',{
    readFile: function (file) {
      return new Promise(function (resolve, reject) {
        fs.readFile(file, "utf-8", function (error, text) {
          if (error)
            reject(new Error(error));
          else
            resolve(text);
        });
      });
    },
    writeFile: function (file, data) {
      return new Promise(function (resolve, reject) {
        fs.writeFile(file, data, "utf-8", function (error) {
          if (error)
            reject(new Error(error);
          else
            resolve(true);
        });
      });
    }
  });
```

Context of methods already extended by request, but you can add some common server context.

```javascript
  ...
  var mongoose = require('mongoose');

  rpcServer.loadModules(__dirname + '/modules/', function () {
    mongoose.connect('mongodb://127.0.0.1:27017/test', function (err, db) {
      rpcServer.context.mongoose = mongoose;
      rpcServer.context.db = db;
      ...
    }
  }
```

And then use this.* in methods:

```javascript

  rpcServer.exposeModule('logs', {
    loginBruteForce: function () {
      //this.db from rpcServer.context
      var logs = this.db.collection('logs');
      //this.req.client_ip from headers
      logs.save({ip: this.req.client_ip, addTime: new Date(), text: "Brute force of login form"});
      return Promise.resolve();
    }
  });
```

CLIENT EXAMPLE
==============

```javascript
  var rpc = require('jrpc2');

  var http = new rpc.httpTransport({port: 8080, hostname: 'localhost'});

  var client = new rpc.Client(http);

  //single call with named parameters
  client.invoke('users.auth', {password: "swd", login: "admin"}, function (err, raw) {
    console.log(err, raw);
  });

  //single call with positional parameters
  client.invoke('users.auth', ["user", "pass"], function (err, raw) {
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
