[![Build Status](https://travis-ci.org/Santinell/jrpc2.svg?branch=master)](https://travis-ci.org/Santinell/jrpc2) [![Coverage Status](https://coveralls.io/repos/Santinell/jrpc2/badge.png)](https://coveralls.io/r/Santinell/jrpc2)

![NPM Info](https://nodei.co/npm/jrpc2.png?downloads=true)

JRPC2
======

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
var rpcServer = new rpc.server();

rpcServer.loadModules(__dirname + '/modules/', function () {
    app.use(route.post('/api', koaMiddleware(rpcServer)));
    app.listen(80);
});

```

Using with Express as middleware:

```javascript

var rpc = require('jrpc2');
var app = require('express')();
var rpcServer = new rpc.server();

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
var rpcServer = new rpc.server();
var httpServer = http.createServer(app);
var io = require('socket.io')(httpServer);

rpcServer.loadModules(__dirname + '/modules/', function () {
  app.post('/api', rpc.middleware(rpcServer));
  io.use(rpc.wsMiddleware(rpcServer));
  httpServer.listen(80);
});

```

JSON-RPC modules loaded automatically. Just put it in one directory.

Example of 'math' module (./modules/math.js in this example):

```javascript

  module.exports = {
    sum: function () {
      var sum = 0;
      for (var key in arguments) {
        sum+=arguments[key];
      }
      this.callback(null, sum);
    },
    log: function (num, base) {
      this.callback(null, Math.log(num)/Math.log(base));
    }
  };
```

If you want you can manual load your methods and modules.

```javascript
  ...
  var rpcServer = new rpc.server();
  var fs = require('fs');

  rpcServer.expose('sayHello',function(){
    this.callback(null, "Hello!");
  });  

  rpcServer.exposeModule('fs',{
    readFile: function (file) {
      fs.readFile(file, "utf-8", function (error, text) {
        if (error)
          this.callback(new Error(error));
        else
          this.callback(null, text);
      });
    },
    writeFile: function (file, data) {
      fs.writeFile(file, data, "utf-8", function (error) {
        if (error)
          this.callback(new Error(error));
        else
          this.callback(null, true);
      });
    }
  });
```

By default server using "callback" mode. (this.callback for return result)
But if you want - you can use Promises (any library that used .than(resolve, reject))

Use first parameter with 'promise' value when instantiating the class rpc.server:
```javascript
  ...
  var rpcServer = new rpc.server('promise');
  var request = require('request');
  var vow = require('vow');

  rpcServer.expose('wget', function(url){
    return new vow.Promise(function(resolve, reject) {
      request(url, function (error, response, body) {
        if (!error && response.statusCode == 200)
          resolve(body);
        else
          reject(error);
      });
    });
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
      this.callback();
    }
  });
```

CLIENT EXAMPLE
==============

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
