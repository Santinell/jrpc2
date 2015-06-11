var should = require("chai").should();
var app = require('express')();
var rpc = require("../lib/jrpc2");
var http = require('http');
var common = require("./common");
var ioc = require('socket.io-client');
var sessionId = common.sessionId;
var server = common.server;
var client = new rpc.Client('ws');
var socket = null;
var httpTransport = null;
var httpClient = null;
var httpServer = null;
var ioServer = null;


describe("Express middleware", function() {

  it("should correct start express with middleware", function() {
    (function() {
      server.checkAuth = common.defaultCheckAuth;
      app.use(rpc.middleware(server));
      expressServer = app.listen(8081);
    }).should.not.throw(Error);
  });

  it("should correct create httpClient", function() {
    httpTransport = new rpc.httpTransport({
      port: 8081
    });
    httpClient = new rpc.Client(httpTransport);
  });

  it("should return accessDenied", function(done) {
    var callback = function(err, raw) {
      should.equal(err, null);
      var obj = JSON.parse(raw);
      obj.should.deep.equal({
        id: 1,
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: 'AccessDenied'
        }
      });
      done();
    };
    httpClient.invoke('math.sum', [3, 12], callback);
  });


  it("should correct works with httpTransport", function(done) {
    httpTransport.setHeader('Cookie', 'sessionID=' + sessionId);
    var callback = function(err, raw) {
      should.not.exist(err);
      var obj = JSON.parse(raw);
      obj.should.deep.equal({
        id: 2,
        jsonrpc: '2.0',
        result: 16
      });
      done();
    };
    httpClient.invoke("math.sum", [4, 12], callback);
  });

});


describe("Socket.io middleware", function() {

  it("should correct start socket.io with middleware", function() {
    (function() {
      httpServer = http.createServer();
      io = require('socket.io')(httpServer);
      io.use(rpc.wsMiddleware(server));
      httpServer.listen(8082);
    }).should.not.throw(Error);
  });



  it("should return accessDenied", function(done) {
    socket = ioc('ws://localhost:8082');
    var onMessage = function(data) {
      var obj = JSON.parse(data);
      obj.should.deep.equal({
        id: 1,
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: 'AccessDenied'
        }
      });
      socket.removeListener('message', onMessage);
      socket.close();
      done();
    };
    var onConnect = function() {
      socket.on('message', onMessage);
      socket.send(client.request('math.sum', [3245, 434]));
    };
    socket.on('connect', onConnect);
  });

  it("should correct works with socket.io Client", function(done) {
    server.checkAuth = function(call, req, callback) {
      callback(true);
    };
    socket.open();
    socket.on('message', function(data) {
      var obj = JSON.parse(data);
      obj.should.deep.equal({
        id: 2,
        jsonrpc: "2.0",
        result: 3679
      });
      done();
    });

  });


});
