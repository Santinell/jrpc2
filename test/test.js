var should = require("chai").should();
var fs = require("fs");
var app = require('express')();
var url = require("url");
var Promise = Promise || require("vow").Promise;
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

  it("should have some fields", function () {
    server = new rpc.server();
    server.should.have.property("methods");
    server.should.have.property("method_args");
    server.should.have.property("module_context");
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
    server.methods.should.have.property("sum");
    server.methods.sum.should.be.an["instanceof"](Function);
  });

  it("should have sucess expose function with promise", function () {
    server.expose("reverse", function (num) {
      return Promise.resolve(num*-1);
    });
    server.should.have.property("methods");
    server.methods.should.have.property("reverse");
    server.methods.reverse.should.be.an["instanceof"](Function);
    var res = server.methods.reverse(13);
    should.not.equal(res, null);
    res.should.have.property("then");
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
    server.methods.should.have.property("getName");
    server.methods["getName"].should.be.an["instanceof"](Function);
    var context = {name: "Ted"};
    var res = server.methods.getName.bind(context)();
    res.should.equal("Ted");
  });

  it("should expose notification", function () {
    server.expose("console", function (message) {
      console.log("    >>" + message);
    });
    server.methods.should.have.property("console");
    should.equal(server.methods.console("Hello server"), undefined);
  });

  it("should error incorrectRequest because of wrong json", function () {
    var callback = function (result) {
      result.should.deep.equal({id: null, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}});
    };
    server.handleCall('{is:those, "last.fm":>}', {}, callback);
  });

  it("should error incorrectRequest because of no quotes of fields", function () {
    var callback = function (result) {
      result.should.deep.equal({id: null, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}});
    };
    server.handleCall('{id: 1, method: "sum", params: [1,3]}', {}, callback);
  });

  it("should error incorrectRequest because of no jsonrpc field", function () {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}});
    };
    server.handleCall('{"id": 1, "method": "sum", "params": [1,3]}', {}, callback);
  });

  it("should error incorrectRequest because of jsonrpc not equal 2.0", function () {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}});
    };
    server.handleCall('{"id": 1, "jsonrpc":"1.0", "method": "sum", "params": [1,3]}', {}, callback);
  });

  it("should error incorrectRequest because of no method field", function () {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}});
    };
    server.handleCall('{"id": 1, "jsonrpc":"2.0", "params": [1,3]}', {}, callback);
  });

  it("should error methodNotFound in request", function () {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', error: {code: -32601, message: 'MethodNotFound'}});
    };
    server.handleCall('{"id": 1, "jsonrpc":"2.0", "method": "bear" }', {}, callback);
  });

  it("should work with positional params", function () {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', result: 15});
    };
    server.handleCall('{"id": 1, "jsonrpc":"2.0", "method": "sum", "params": [3, 12] }', {}, callback);
  });

  it("should work with named params", function () {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', result: 0.9266284080291269});
    };
    server.handleCall('{"id": 1, "jsonrpc":"2.0", "method": "math.log", "params": {"num":10,"base":12} }', {}, callback);
  });

  it("should correct work with promises (200s delay)", function (done) {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', result: -130});
      done();
    };
    server.handleCall('{"id": 1, "jsonrpc": "2.0", "method": "reverse", "params": {"num": 130}}', {}, callback);
  });

  it("should error on empty batch", function () {
    var callback = function (result) {
      result.should.deep.equal({id: null, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}});
    };
    server.handleCall('[]', {}, callback);
  });

  it("should error on invalid batch", function () {
    var callback = function (result) {
      result.should.deep.equal([
        {id: null, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}},
        {id: null, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}},
        {id: null, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}}
      ]);
    };
    server.handleCall('[1,2,3]', {}, callback);
  });

  it("should correct work with batch", function () {
    var callback = function (result) {
      result.should.deep.equal([
        {id: 1, jsonrpc: '2.0', result: 29},
        {id: 2, jsonrpc: '2.0', result: 1.4159758378145286}
      ]);
    };
    server.handleCall('[{"id": 1, "jsonrpc":"2.0", "method": "sum", "params": [13, 16] },{"jsonrpc":"2.0", "method": "console", "params": ["Test batch"]},{"id": 2, "jsonrpc":"2.0", "method": "math.log", "params": {"num":19,"base":8} }]', {}, callback);
  });

  it("should correct set checkAuth function", function (done) {
    var callback = function(res) {
      res.should.equal(true);
      server.checkAuth = function (call, req, callback) {
        callback(call.method === "users.auth");
      };
      var callback2 = function(result) {
        result.should.not.equal(true);
        done();
      }
      server.checkAuth({}, {}, callback2);
    }
    server.checkAuth({}, {}, callback);
  });

  it("should correct work with promised checkAuth function", function (done) {
    server.checkAuth = function (call, req, callback) {
      if (call.method === "users.auth" || call.method === "users.context") {
        callback(true);
      } else {
        var tmp = req?(req.headers?req.headers.cookie:""):""
        var cookies = url.parse("?" + tmp, true).query;
        callback(cookies.sessionID === sessionId);
      }
    };
    var callback = function(res) {
      res.should.not.equal(true);
      done();
    }
    server.checkAuth({}, {}, callback);
  });

  it("should sessionId with right login and password", function () {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', result: {sessionID: sessionId}});
    };
    server.handleCall('{"id": 1, "jsonrpc":"2.0", "method": "users.auth", "params": ["admin", "swd"] }', {}, callback);
  });

  it("should error for wrong login or password", function () {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', error: {code: -32099, message: 'Wrong login or password'}});
    };
    server.handleCall('{"id": 1, "jsonrpc":"2.0", "method": "users.auth", "params": ["Ted", "frisbee"] }', {}, callback);
  });

  it("should return context of this", function () {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', result:["auth", "context", "req"] });
    };
    server.handleCall('{"id": 1, "jsonrpc":"2.0", "method": "users.context", "params": [] }', {}, callback);
  });

  it("should AccessDenied for request without sessionID", function () {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', error: {code: -32000, message: 'AccessDenied'}});
    };
    server.handleCall('{"id": 1, "jsonrpc":"2.0", "method": "sum", "params": [1, 5] }', {}, callback);
  });

  it("should AccessDenied for wrong sessionID", function () {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', error: {code: -32000, message: 'AccessDenied'}});
    };
    server.handleCall('{"id": 1, "jsonrpc":"2.0", "method": "sum", "params": [1, 5] }', {headers:{cookie: "sessionID=123"}}, callback);
  });

  it("should correct result with correct sessionID", function () {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', result: 6});
    };
    server.handleCall('{"id": 1, "jsonrpc":"2.0", "method": "sum", "params": [1, 5] }', {headers:{cookie: "sessionID=" + sessionId}}, callback);
  });
});


describe("httpsServer", function () {

  it("should throw error because of no params", function () {
    (function () {
      new rpc.httpTransport();
    }).should.throw(Error);
  });

  it("should correct save params", function () {
    httpsTransport = new rpc.httpTransport({port: 8443, ssl: false});
    httpsTransport.should.have.property("params");
    httpsTransport.should.have.property("http");
    httpsTransport.params.should.deep.equal({port: 8443, ssl: false});
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
    tcpTransport = new rpc.tcpTransport({port: 9000});
    tcpTransport.params.should.deep.equal({port: 9000});
    tcpTransport.listen.should.throw(Error);
  });

  it("should success listen server", function (done) {
    (function () {
      tcpTransport.listen(server);
      done();
    }).should.not.throw(Error);
  });
});

describe("httpsClient", function () {

  it("should throw error because of no transport", function () {
    (function () {
      new rpc.client();
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
    httpsClient.invoke('sum', [3, 12], function (err, raw) {
      should.equal(err, null);
      var obj = JSON.parse(raw);
      obj.should.deep.equal({id: 2, jsonrpc: "2.0", error: {code: -32000, message: 'AccessDenied'}});
      done();
    });
  });

  it("should success call single method sum", function (done) {

    httpsTransport.setHeader('Cookie', 'sessionID=' + sessionId);
    httpsClient.invoke('sum', [5, 16], function (err, raw) {
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

    httpsClient.invoke('math.log', [10, 12], function (err, raw) {
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
      new rpc.client();
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
    tcpClient.invoke('sum', [3, 12], function (err, raw) {
      server.checkAuth = function (call, req, callback) {
        callback(true);
      };
      should.equal(err, null);
      var obj = JSON.parse(raw);
      obj.should.deep.equal({id: 2, jsonrpc: "2.0", error: {code: -32000, message: 'AccessDenied'}});
      done();
    });
  });

  it("should success call single method sum", function (done) {
    tcpClient.invoke('sum', [5, 16], function (err, raw) {
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
    tcpClient.invoke('math.log', [10, 12], function (err, raw) {
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
      app.use(rpc.middleware(server));
      expressServer = app.listen(8081);
    }).should.not.throw(Error)
  });

  it("should correct works with httpClient", function (done) {
    var httpTransport = new rpc.httpTransport({port:8081});
    httpTransport.setHeader('Cookie', 'sessionID=' + sessionId);
    httpClient = new rpc.client(httpTransport);
    var callback = function(err, raw){
      should.not.exist(err);
      var obj = JSON.parse(raw);
      obj.should.deep.equal({id: 1, jsonrpc: '2.0', result: 16});
      done();
    };
    httpClient.invoke("sum", [4, 12], callback);
  });

});
