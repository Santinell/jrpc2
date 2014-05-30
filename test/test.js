var should = require("chai").should();
var fs = require("fs");
var url = require("url");
var Q = require("q");
var rpc = require("../lib/jrpc2");
var server = null;
var httpsTransport = null;
var tcpTransport = null;
var httpsClient = null;
var httpClient = null;
var tcpClient = null;
var sessionId = "9037c4852fc3a3f452b1ee2b93150603";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";


describe("RPC Core", function () {
  it("should have a Client, Server, rpcError and transports", function () {
    rpc.should.respondTo("server", "client", "httpTransport", "tcpTransport", "rpcError");
  });
});


describe("rpcError", function () {
  var rpcError = rpc.rpcError;
  it("should have methods: abstract, parseError, invalidRequest, methodNotFound, invalidParams", function () {
    rpcError.should.respondTo("abstract", "parseError", "invalidRequest", "methodNotFound", "invalidParams");
  });

  it("should generate abstract error with defaults", function () {
    rpcError.abstract('Test').should.deep.equal({id: null, jsonrpc: "2.0", error: {code: -32099, message: "Test"}});
  });

  it("should generate abstract error with passed parameters", function () {
    rpcError.abstract('Rom', -32016, 42).should.deep.equal({id: 42, jsonrpc: "2.0", error: {code: -32016, message: "Rom"}});
  });

  it("should generate parseError", function () {
    rpcError.parseError(13).should.deep.equal({id: 13, jsonrpc: "2.0", error: {code: -32700, message: "ParseError"}});
  });

  it("should generate parseError with defaults", function () {
    rpcError.parseError().should.deep.equal({id: null, jsonrpc: "2.0", error: {code: -32700, message: "ParseError"}});
  });

  it("should generate invalidRequest", function () {
    rpcError.invalidRequest(22).should.deep.equal({id: 22, jsonrpc: "2.0", error: {code: -32600, message: "InvalidRequest"}});
  });

  it("should generate invalidRequest with defaults", function () {
    rpcError.invalidRequest().should.deep.equal({id: null, jsonrpc: "2.0", error: {code: -32600, message: "InvalidRequest"}});
  });

  it("should generate methodNotFound ", function () {
    rpcError.methodNotFound(64).should.deep.equal({id: 64, jsonrpc: "2.0", error: {code: -32601, message: "MethodNotFound"}});
  });

  it("should generate methodNotFound with defaults", function () {
    rpcError.methodNotFound().should.deep.equal({id: null, jsonrpc: "2.0", error: {code: -32601, message: "MethodNotFound"}});
  });

  it("should generate invalidParams ", function () {
    rpcError.invalidParams(89).should.deep.equal({id: 89, jsonrpc: "2.0", error: {code: -32602, message: "InvalidParams"}});
  });

  it("should generate invalidParams with defaults", function () {
    rpcError.invalidParams().should.deep.equal({id: null, jsonrpc: "2.0", error: {code: -32602, message: "InvalidParams"}});
  });
});


describe("Server", function () {

  it("should have context", function () {
    server = new rpc.server();
    server.should.have.property("context");
  });

  it("should correct load modules from directory", function () {
    server.loadModules(__dirname + "/modules/", function () {
      server.methods.should.have.property("users.auth");
      server.methods.should.have.property("logs.userLogout");
      server.methods["users.auth"].should.be.an["instanceof"](Function);
    });
  });

  it("should have success function expose", function () {
    server.expose("sum", function (a, b) {
      return a + b;
    });
    server.should.have.property("methods");
    server.methods.should.have.property("sum");
    server.methods["sum"].should.be.an["instanceof"](Function);
  });

  it("should have sucess expose function with promise", function () {
    server.expose("reverse", function (num) {
      /*return Q.fcall(function () {
        return num*-1;
      });*/
      return Q.delay(500).then(function () {
        return num*-1;
      });
    });
    server.should.have.property("methods");
    server.methods.should.have.property("reverse");
    server.methods["reverse"].execute(server, [13]).should.have.property("then");
    server.methods["reverse"].should.be.an["instanceof"](Function);
  });

  it("should have success module expose", function () {
    server.exposeModule("math", {
      log: function (num, base) {
        return Math.log(num) / Math.log(base);
      }
    });
    server.should.have.property("methods");
    server.methods.should.have.property("math.log");
    server.methods["math.log"].should.be.an["instanceof"](Function);
  });

  it("should correct work with context", function () {
    server.expose("getName", function () {
      return this.name;
    });
    var context = {name: "Ted"};
    server.methods["getName"].execute(context, []).should.equal("Ted");
  });

  it("should expose notification", function () {
    server.expose("console", function (message) {
      console.log("    >>" + message);
    });
    server.methods.should.have.property("console");
    should.equal(server.methods["console"]("Hello server"), undefined);
  });

  it("should error incorrectRequest because of wrong json", function () {
    var callback = function (result) {
      result.should.deep.equal({id: null, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}});
    };
    server.handleRequest('{is:those, "last.fm":>}', {}, callback);
  });

  it("should error incorrectRequest because of no quotes of fields", function () {
    var callback = function (result) {
      result.should.deep.equal({id: null, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}});
    };
    server.handleRequest('{id: 1, method: "sum", params: [1,3]}', {}, callback);
  });

  it("should error incorrectRequest because of no jsonrpc field", function () {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}});
    };
    server.handleRequest('{"id": 1, "method": "sum", "params": [1,3]}', {}, callback);
  });

  it("should error incorrectRequest because of jsonrpc not equal 2.0", function () {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}});
    };
    server.handleRequest('{"id": 1, "jsonrpc":"1.0", "method": "sum", "params": [1,3]}', {}, callback);
  });

  it("should error incorrectRequest because of no method field", function () {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}});
    };
    server.handleRequest('{"id": 1, "jsonrpc":"2.0", "params": [1,3]}', {}, callback);
  });

  it("should error methodNotFound in request", function () {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', error: {code: -32601, message: 'MethodNotFound'}});
    };
    server.handleRequest('{"id": 1, "jsonrpc":"2.0", "method": "bear" }', {}, callback);
  });

  it("should work with positional params", function () {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', result: 15});
    };
    server.handleRequest('{"id": 1, "jsonrpc":"2.0", "method": "sum", "params": [3, 12] }', {}, callback);
  });

  it("should work with named params", function () {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', result: 0.9266284080291269});
    };
    server.handleRequest('{"id": 1, "jsonrpc":"2.0", "method": "math.log", "params": {"num":10,"base":12} }', {}, callback);
  });

  it("should correct work with promises", function (done) {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', result: -13});
      done();
    };
    server.handleRequest('{"id": 1, "jsonrpc": "2.0", "method": "reverse", "params": {"num": 13}}', {}, callback);
  });

  it("should error on empty batch", function () {
    var callback = function (result) {
      result.should.deep.equal({id: null, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}});
    };
    server.handleRequest('[]', {}, callback);
  });

  it("should error on invalid batch", function () {
    var callback = function (result) {
      result.should.deep.equal([
        {id: null, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}},
        {id: null, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}},
        {id: null, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}}
      ]);
    };
    server.handleRequest('[1,2,3]', {}, callback);
  });

  it("should correct work with batch", function () {
    var callback = function (result) {
      result.should.deep.equal([
        {id: 1, jsonrpc: '2.0', result: 29},
        {id: 2, jsonrpc: '2.0', result: 1.4159758378145286}
      ]);
    };
    server.handleRequest('[{"id": 1, "jsonrpc":"2.0", "method": "sum", "params": [13, 16] },{"jsonrpc":"2.0", "method": "console", "params": ["Test batch"]},{"id": 2, "jsonrpc":"2.0", "method": "math.log", "params": {"num":19,"base":8} }]', {}, callback);
  });

  it("should correct set checkAuth function", function () {
    server.checkAuth("", [], {}).should.equal(true);
    server.checkAuth = function (method, params, headers) {
      return method === "users.auth";
    };
    server.checkAuth("", [], {}).should.not.equal(true);
  });

  it("should correct work with promised checkAuth function", function () {
    server.checkAuth = function (method, params, headers) {
      if (method === "users.auth") {
        return true;
      } else {
        var cookies = url.parse("?" + (headers.cookie || ""), true).query;
        var sessionID = cookies.sessionID || "";
        return Q.delay(100).then(function () {
          headers.checked = true;
          return sessionID === "9037c4852fc3a3f452b1ee2b93150603";
        });
      }
    };
    server.checkAuth("", [], {}).should.not.equal(true);
  });

  it("should sessionId with right login and password", function () {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', result: {sessionID: sessionId}});
    };
    server.handleRequest('{"id": 1, "jsonrpc":"2.0", "method": "users.auth", "params": ["admin", "swd"] }', {}, callback);
  });

  it("should error for wrong login or password", function () {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', error: {code: -32099, message: 'Wrong login or password'}});
    };
    server.handleRequest('{"id": 1, "jsonrpc":"2.0", "method": "users.auth", "params": ["Ted", "frisbee"] }', {}, callback);
  });

  it("should AccessDenied for request without sessionID", function () {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', error: {code: -32000, message: 'AccessDenied'}});
    };
    server.handleRequest('{"id": 1, "jsonrpc":"2.0", "method": "sum", "params": [1, 5] }', {}, callback);
  });

  it("should AccessDenied for wrong sessionID", function () {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', error: {code: -32000, message: 'AccessDenied'}});
    };
    server.handleRequest('{"id": 1, "jsonrpc":"2.0", "method": "sum", "params": [1, 5] }', {cookie: "sessionID=123"}, callback);
  });

  it("should correct result with correct sessionID", function () {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', result: 6});
    };
    server.handleRequest('{"id": 1, "jsonrpc":"2.0", "method": "sum", "params": [1, 5] }', {cookie: "sessionID=" + sessionId}, callback);
  });
});


describe("httpsServer", function () {

  it("should throw error because of no params", function () {
    (function () {
      new rpc.httpTransport();
    }).should.throw(Error);
  });

  it("should correct save params", function () {
    httpsTransport = new rpc.httpTransport({port: 8443, ssl: true});
    httpsTransport.should.have.property("params");
    httpsTransport.should.have.property("http");
    httpsTransport.params.should.deep.equal({port: 8443, ssl: true});
  });

  it("should success set header", function () {
    httpsTransport.setHeader('test', 'value-612');
    httpsTransport.params.headers.should.deep.equal({test: 'value-612'});
  });

  it("should success remove header", function () {
    httpsTransport.removeHeader('test');
    httpsTransport.params.headers.should.deep.equal({});
  });

  it("should throw error because of no key+cert", function () {
    httpsTransport.listen.should.throw(Error);
  });

  it("should throw error because of no cert", function () {
    httpsTransport.params.key = fs.readFileSync(__dirname + "/keys/ssl-key.pem");
    httpsTransport.listen.should.throw(Error);
  });

  it("should throw error because of no server", function () {
    httpsTransport.params.cert = fs.readFileSync(__dirname + "/keys/ssl-cert.pem");
    httpsTransport.listen.should.throw(Error);
  });

  it("should success listen server", function () {
    (function () {
      httpsTransport.listen(server);
    }).should.not.throw(Error);
  });
});


describe("tcpTransport", function () {

  it("should throw error because of no params", function () {
    (function () {
      new rpc.tcpTransport();
    }).should.throw(Error);
  });

  it("should correct save params", function () {
    tcpTransport = new rpc.tcpTransport({});
    tcpTransport.should.have.property("params");
  });

  it("should throw error because of no port", function () {
    tcpTransport.listen.should.throw(Error);
  });

  it("should throw error because of no server", function () {
    tcpTransport.params.port = 9000;
    tcpTransport.params.should.deep.equal({port: 9000});
    tcpTransport.listen.should.throw(Error);
  });

  it("should success listen server", function () {
    (function () {
      tcpTransport.listen(server);
    }).should.not.throw(Error);
  });
});


describe("httpsClient", function () {

  it("should throw error because of no transport", function () {
    (function () {
      new rpc.client;
    }).should.throw(Error);
  });

  it("should have transport and id", function () {
    httpsClient = new rpc.client(httpsTransport);
    httpsClient.should.have.property("transport");
    httpsClient.should.have.property("id");
    httpsClient.id.should.equal(0);
    httpsClient.transport.should.not.equal(null);
  });

  it("should correct generate requests", function () {
    httpsClient.request("sum", [1, "2", null]).should.deep.equal({id: 1, jsonrpc: "2.0", method: "sum", params: [1, "2", null]});
    httpsClient.request("console", {message: "Hello world!"}, false).should.deep.equal({jsonrpc: "2.0", method: "console", params: {message: "Hello world!"}});
  });

  it("should return accessDenied", function (done) {
    httpsClient.call('sum', [3, 12], function (err, raw) {
      should.equal(err, null);
      var obj = JSON.parse(raw);
      obj.should.deep.equal({id: 2, jsonrpc: "2.0", error: {code: -32000, message: 'AccessDenied'}});
      done();
    });
  });

  it("should success call single method sum", function (done) {

    httpsTransport.setHeader('Cookie', 'sessionID=' + sessionId);
    httpsClient.call('sum', [5, 16], function (err, raw) {
      should.equal(err, null);
      var obj = JSON.parse(raw);
      obj.should.deep.equal({id: 3, jsonrpc: "2.0", result: 21});
      done();
    });
  });

  it("should notice without result", function () {
    var res = httpsClient.notify("console", ["Hello httpsServer!"]);
    should.equal(res, true);
  });

  it("should success call single method math.log", function (done) {

    httpsClient.call('math.log', [10, 12], function (err, raw) {
      should.equal(err, null);
      var obj = JSON.parse(raw);
      obj.should.deep.equal({id: 4, jsonrpc: "2.0", result: 0.9266284080291269});
      done();
    });
  });

  it("should success call batch", function (done) {

    var methods = ['sum', 'math.log'];
    var params = [
      [1, 9],
      [10, 12]
    ];
    httpsClient.batch(methods, params, function (err, raw) {
      should.equal(err, null);
      var obj = JSON.parse(raw);
      obj.should.deep.equal([
        {id: 5, jsonrpc: "2.0", result: 10},
        {id: 6, jsonrpc: "2.0", result: 0.9266284080291269}
      ]);
      done();
    });

  });

});


describe("tcpClient", function () {

  it("should throw error because of no transport", function () {
    (function () {
      new rpc.client;
    }).should.throw(Error);
  });

  it("should have transport and id", function () {
    tcpClient = new rpc.client(tcpTransport);
    tcpClient.should.have.property("transport");
    tcpClient.should.have.property("id");
    tcpClient.id.should.equal(0);
    tcpClient.transport.should.not.equal(null);
  });

  it("should correct generate requests", function () {
    tcpClient.request("sum", [1, "2", null]).should.deep.equal({id: 1, jsonrpc: "2.0", method: "sum", params: [1, "2", null]});
    tcpClient.request("console", {message: "Hello world!"}, false).should.deep.equal({jsonrpc: "2.0", method: "console", params: {message: "Hello world!"}});
  });

  it("should return accessDenied", function (done) {
    tcpClient.call('sum', [3, 12], function (err, raw) {
      server.checkAuth = function (method, params, headers) {
        return true;
      };
      should.equal(err, null);
      var obj = JSON.parse(raw);
      obj.should.deep.equal({id: 2, jsonrpc: "2.0", error: {code: -32000, message: 'AccessDenied'}});
      done();
    });
  });

  it("should success call single method sum", function (done) {
    tcpClient.call('sum', [5, 16], function (err, raw) {
      should.equal(err, null);
      var obj = JSON.parse(raw);
      obj.should.deep.equal({id: 3, jsonrpc: "2.0", result: 21});
      done();
    });
  });

  it("should notice without result", function () {
    var res = tcpClient.notify("console", ["Hello tcpServer!"]);
    should.equal(res, true);
  });

  it("should success call single method math.log", function (done) {
    tcpClient.call('math.log', [10, 12], function (err, raw) {
      should.equal(err, null);
      var obj = JSON.parse(raw);
      obj.should.deep.equal({id: 4, jsonrpc: "2.0", result: 0.9266284080291269});
      done();
    });
  });

  it("should success call batch", function (done) {
    var methods = ['sum', 'math.log'];
    var params = [
      [1, 9],
      [10, 12]
    ];
    tcpClient.batch(methods, params, function (err, raw) {
      should.equal(err, null);
      var obj = JSON.parse(raw);
      obj.should.deep.equal([
        {id: 5, jsonrpc: "2.0", result: 10},
        {id: 6, jsonrpc: "2.0", result: 0.9266284080291269}
      ]);
      done();
    });
  });
});



describe("Express middleware", function () {

  it("should correct start express with middleware", function () {
    (function () {
      var express = require('express');
      app = express();
      app.use(rpc.middleware(server));
      expressServer = app.listen(8080);
    }).should.not.throw(Error)
  });

  it("should correct works with httpClient", function (done) {
    var httpTransport = new rpc.httpTransport({port:8080});
    httpClient = new rpc.client(httpTransport);
    var callback = function(err, raw){
      should.not.exist(err);
      var obj = JSON.parse(raw);
      obj.should.deep.equal({id: 1, jsonrpc: '2.0', result: 0.5578858913022596});
      done();
    };
    httpClient.call("math.log", [4, 12], callback);
  });

  it("should correct works with httpTransport", function (done) {
    expressServer.close();
    var httpTransport = new rpc.httpTransport({port:8080, framework: app});
    httpTransport.listen(server);
    var callback = function(err, raw){
      should.not.exist(err);
      var obj = JSON.parse(raw);
      obj.should.deep.equal({id: 2, jsonrpc: '2.0', result: 1.6798970175607097});
      done();
    };
    httpClient.call("math.log", [65, 12], callback);
  });
});