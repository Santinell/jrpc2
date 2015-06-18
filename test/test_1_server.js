var should = require("chai").should();
var Promise = require("bluebird");
var rpc = require("../lib/jrpc2");
var sessionId = require("./common").sessionId;
var url = require("url");
var server = null;


describe("RPC Core", function () {
  it("should have a Client, Server, rpcError and transports", function () {
    rpc.should.respondTo("Server", "Client", "httpTransport", "tcpTransport", "rpcError");
  });
});

describe("Server", function () {

  it("should have some fields", function () {
    server = new rpc.Server();
    server.should.have.property("methodArgs");
    server.should.have.property("modules");
    server.should.have.property("context");
  });

  it("should correct load modules from directory", function (done) {
    server.loadModules(__dirname + "/modules/", function () {
      server.modules.should.have.property("users");
      server.modules.should.have.property("logs");
      server.modules.users.should.have.property("auth");
      server.modules.logs.should.have.property("userLogout");
      server.modules.users.auth.should.be.an["instanceof"](Function);
      done();
    });
  });

  it("should have success function expose", function () {
    server.expose("sum", function (a, b) {
      return a + b;
    });
    server.modules.methods.should.have.property("sum");
    server.modules.methods.sum.should.be.an["instanceof"](Function);
  });

  it("should have sucess expose function with promise", function () {
    server.expose("reverse", function (num) {
      return Promise.resolve(num*-1);
    });
    server.modules.methods.should.have.property("reverse");
    server.modules.methods.reverse.should.be.an["instanceof"](Function);
    var res = server.modules.methods.reverse(13);
    should.not.equal(res, null);
    res.should.have.property("then");
  });

  it("should have success module expose", function () {
    server.exposeModule("math", {
      log: function (num, base) {
        return Math.log(num) / Math.log(base);
      }
    });
    server.modules.should.have.property("math");
    server.modules.math.should.have.property("log");
    server.modules.math.log.should.be.an["instanceof"](Function);
  });

  it("should have success expose module with submodules", function () {
    server.exposeModule("test", {
      sub1: {
        sum: function (a, b) {
          return a+b;
        },
        diff: function (a, b) {
          return a-b;
        }
      },
      sub2: {
        prod: function (a, b) {
          return a*b;
        },
        div: function (a, b) {
          return a/b;
        }
      },
    });

    server.modules.should.have.property("test.sub1");
    server.modules["test.sub1"].should.have.property("sum");
    server.modules["test.sub1"].should.have.property("diff");
    server.modules["test.sub1"].sum.should.be.an["instanceof"](Function);
    server.modules["test.sub1"].diff.should.be.an["instanceof"](Function);

    server.modules.should.have.property("test.sub2");
    server.modules["test.sub2"].should.have.property("prod");
    server.modules["test.sub2"].should.have.property("div");
    server.modules["test.sub2"].prod.should.be.an["instanceof"](Function);
    server.modules["test.sub2"].div.should.be.an["instanceof"](Function);
  });

  it("should have success expose with long names", function () {
    server.expose("test.test1", function (a, b) {
      return a-14;
    });
    server.modules.should.have.property("test");
    server.modules["test"].should.have.property("test1");
    server.modules["test"].test1.should.be.an["instanceof"](Function);
  });

  it("should have success expose with very long names", function () {
    server.expose("test.subtest.test2", function (a, b) {
      return a-199;
    });

    server.modules.should.have.property("test.subtest");
    server.modules["test.subtest"].should.have.property("test2");
    server.modules["test.subtest"].test2.should.be.an["instanceof"](Function);
  });

  it("should have success expose with extreemly long names", function () {
    server.expose("test.subtest.subsubtest.subsubsubtest.test3", function (a, b) {
      return a-19999999;
    });

    server.modules.should.have.property("test.subtest.subsubtest.subsubsubtest");
    server.modules["test.subtest.subsubtest.subsubsubtest"].should.have.property("test3");
    server.modules["test.subtest.subsubtest.subsubsubtest"].test3.should.be.an["instanceof"](Function);
  });

  it("should expose notification", function () {
    server.expose("console", function (message) {
      console.log("    >>" + message);
    });
    server.modules.methods.should.have.property("console");
    should.equal(server.modules.methods.console("Hello server"), undefined);
  });

  it("should error incorrectRequest because of wrong json", function (done) {
    var callback = function (result) {
      result.should.deep.equal({id: null, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}});
      done();
    };
    server.handleCall('{is:those, "last.fm":>}', {}, callback);
  });

  it("should error incorrectRequest because of no quotes of fields", function (done) {
    var callback = function (result) {
      result.should.deep.equal({id: null, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}});
      done();
    };
    server.handleCall('{id: 1, method: "sum", params: [1,3]}', {}, callback);
  });

  it("should error incorrectRequest because of no jsonrpc field", function (done) {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}});
      done();
    };
    server.handleCall('{"id": 1, "method": "sum", "params": [1,3]}', {}, callback);
  });

  it("should error incorrectRequest because of jsonrpc not equal 2.0", function (done) {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}});
      done();
    };
    server.handleCall('{"id": 1, "jsonrpc":"1.0", "method": "sum", "params": [1,3]}', {}, callback);
  });

  it("should error incorrectRequest because of no method field", function (done) {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}});
      done();
    };
    server.handleCall('{"id": 1, "jsonrpc":"2.0", "params": [1,3]}', {}, callback);
  });

  it("should error methodNotFound in request", function (done) {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', error: {code: -32601, message: 'MethodNotFound'}});
      done();
    };
    server.handleCall('{"id": 1, "jsonrpc":"2.0", "method": "bear" }', {}, callback);
  });

  it("should contain error id identical to request id when request id = 0", function(done) {
    var callback = function (result) {
      result.should.deep.equal({id: 0, jsonrpc: '2.0', error: {code: -32601, message: 'MethodNotFound'}});
      done();
    };
    server.handleCall('{"id": 0, "jsonrpc":"2.0", "method": "bear" }', {}, callback);
  });

  it("should contain error id identical to request id when request id is non-numeric", function(done) {
    var callback = function (result) {
      result.should.deep.equal({id: "non-numeric", jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}});
      done();
    };
    server.handleCall('{"id": "non-numeric", "jsonrpc":"1.0", "method": "sum", "params": [1,3]}', {}, callback);
  });

  it("should contain an id field equal to request id even if non-numeric", function(done) {
    var callback = function (result) {
      result.should.deep.equal({id: "non-numeric", jsonrpc: '2.0', result: 24});
      done();
    };
    server.handleCall('{"id": "non-numeric", "jsonrpc":"2.0", "method": "sum", "params": [12, 12] }', {}, callback);
  });

  it("should contain an id field equal to request id even when zero", function(done) {
    var callback = function (result) {
      result.should.deep.equal({id: 0, jsonrpc: '2.0', result: 24});
      done();
    };
    server.handleCall('{"id": 0, "jsonrpc":"2.0", "method": "sum", "params": [12, 12] }', {}, callback);
  });

  it("should work with positional params", function (done) {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', result: 15});
      done();
    };
    server.handleCall('{"id": 1, "jsonrpc":"2.0", "method": "sum", "params": [3, 12] }', {}, callback);
  });

  it("should work with named params", function (done) {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', result: 0.9266284080291269});
      done();
    };
    server.handleCall('{"id": 1, "jsonrpc":"2.0", "method": "math.log", "params": {"num":10,"base":12} }', {}, callback);
  });

  it("should correct work with promises", function (done) {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', result: -130});
      done();
    };
    server.handleCall('{"id": 1, "jsonrpc": "2.0", "method": "reverse", "params": {"num": 130}}', {}, callback);
  });

  it("should error on empty batch", function (done) {
    var callback = function (result) {
      result.should.deep.equal({id: null, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}});
      done();
    };
    server.handleCall('[]', {}, callback);
  });

  it("should error on invalid batch", function (done) {
    var callback = function (result) {
      result.should.deep.equal([
        {id: null, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}},
        {id: null, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}},
        {id: null, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}}
      ]);
      done();
    };
    server.handleCall('[1,2,3]', {}, callback);
  });

  it("should correct work with batch", function (done) {
    var callback = function (result) {
      result.should.deep.equal([
        {id: 1, jsonrpc: '2.0', result: 29},
        {id: 2, jsonrpc: '2.0', result: 1.4159758378145286}
      ]);
      done();
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
      };
      server.checkAuth({}, {}, callback2);
    };
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
    };
    server.checkAuth({}, {}, callback);
  });

  it("should sessionId with right login and password", function (done) {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', result: {sessionID: sessionId}});
      done();
    };
    server.handleCall('{"id": 1, "jsonrpc":"2.0", "method": "users.auth", "params": ["admin", "swd"] }', {}, callback);
  });

  it("should error for wrong login or password", function (done) {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', error: {code: -32099, message: 'Wrong login or password'}});
      done();
    };
    server.handleCall('{"id": 1, "jsonrpc":"2.0", "method": "users.auth", "params": ["Ted", "frisbee"] }', {}, callback);
  });

  it("should return context of this", function (done) {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', result:["auth", "context", "req"] });
      done();
    };
    server.handleCall('{"id": 1, "jsonrpc":"2.0", "method": "users.context", "params": [] }', {}, callback);
  });

  it("should AccessDenied for request without sessionID", function (done) {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', error: {code: -32000, message: 'AccessDenied'}});
      done();
    };
    server.handleCall('{"id": 1, "jsonrpc":"2.0", "method": "sum", "params": [1, 5] }', {}, callback);
  });

  it("should AccessDenied for wrong sessionID", function (done) {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', error: {code: -32000, message: 'AccessDenied'}});
      done();
    };
    server.handleCall('{"id": 1, "jsonrpc":"2.0", "method": "sum", "params": [1, 5] }', {headers:{cookie: "sessionID=123"}}, callback);
  });

  it("should correct result with correct sessionID", function (done) {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', result: 6});
      done();
    };
    server.handleCall('{"id": 1, "jsonrpc":"2.0", "method": "sum", "params": [1, 5] }', {headers:{cookie: "sessionID=" + sessionId}}, callback);
  });
});
