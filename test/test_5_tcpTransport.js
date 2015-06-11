var should = require("chai").should();
var fs = require("fs");
var os = require("os");
var crypto = require("crypto");
var rpc = require("../lib/jrpc2");
var common = require("./common");
var server = common.server;
var tcpTransport = null;
var tcpClient = null;


describe("tcpTransport", function() {

  it("should throw error because of no params", function() {
    (function() {
      new rpc.tcpTransport();
    }).should.throw(Error);
  });

  it("should correct save params", function() {
    server.checkAuth = common.defaultCheckAuth;
    tcpTransport = new rpc.tcpTransport({});
    tcpTransport.should.have.property("params");
  });

  it("should throw error because of no port or path", function() {
    tcpTransport.listen.should.throw(Error);
  });

  it("should throw error because of no server (path)", function() {
    var tcpTransport = new rpc.tcpTransport({
      path: "/some/absurd/path"
    });
    tcpTransport.params.should.deep.equal({
      path: "/some/absurd/path"
    });
    tcpTransport.listen.should.throw(Error);
  });

  it("should throw error because of no server (port)", function() {
    tcpTransport = new rpc.tcpTransport({
      port: 9000
    });
    tcpTransport.params.should.deep.equal({
      port: 9000
    });
    tcpTransport.listen.should.throw(Error);
  });

  it("should success listen server", function(done) {
    (function() {
      tcpTransport.listen(server);
      done();
    }).should.not.throw(Error);
  });
});



describe("tcpClient", function() {

  it("should throw error because of no transport", function() {
    (function() {
      new rpc.Client();
    }).should.throw(Error);
  });

  it("should have transport and id", function() {
    tcpClient = new rpc.Client(tcpTransport);
    tcpClient.should.have.property("transport");
    tcpClient.should.have.property("id");
    tcpClient.id.should.equal(0);
    tcpClient.transport.should.not.equal(null);
  });

  it("should correct generate requests", function() {
    tcpClient.request("sum", [1, "2", null]).should.deep.equal({
      id: 1,
      jsonrpc: "2.0",
      method: "sum",
      params: [1, "2", null]
    });
    tcpClient.request("console", {
      message: "Hello world!"
    }, false).should.deep.equal({
      jsonrpc: "2.0",
      method: "console",
      params: {
        message: "Hello world!"
      }
    });
  });

  it("should return accessDenied", function(done) {
    tcpClient.invoke('math.sum', [3, 19], function(err, raw) {
      should.equal(err, null);
      var obj = JSON.parse(raw);
      obj.should.deep.equal({
        id: 2,
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: 'AccessDenied'
        }
      });
      server.checkAuth = function(call, req, callback) {
        callback(true);
      };
      done();
    });
  });

  it("should be able to utilize unix socket connection", function(done) {
    var socketFile = os.tmpdir() + "/" + crypto.randomBytes(4).readUInt32LE(0) + crypto.randomBytes(4).readUInt32LE(0) + ".socket";
    var tcpTransport = new rpc.tcpTransport({
      path: socketFile
    });
    tcpTransport.listen(server);
    var tcpClient = new rpc.Client(tcpTransport);
    tcpClient.invoke('math.sum', [5, 16], function(err, raw) {
      fs.unlinkSync(socketFile);
      should.equal(err, null);
      var obj = JSON.parse(raw);
      obj.should.deep.equal({
        id: 1,
        jsonrpc: "2.0",
        result: 21
      });
      done();
    });
  });

  it("should success call single method sum", function(done) {
    tcpClient.invoke('math.sum', [5, 16], function(err, raw) {
      should.equal(err, null);
      var obj = JSON.parse(raw);
      obj.should.deep.equal({
        id: 3,
        jsonrpc: "2.0",
        result: 21
      });
      done();
    });
  });

  it("should notice without result", function() {
    var res = tcpClient.notify("console", ["Hello tcpServer!"]);
    should.equal(res, true);
  });

  it("should success call single method math.log", function(done) {
    tcpClient.invoke('math.log', [10, 12], function(err, raw) {
      should.equal(err, null);
      var obj = JSON.parse(raw);
      obj.should.deep.equal({
        id: 4,
        jsonrpc: "2.0",
        result: 0.9266284080291269
      });
      done();
    });
  });

  it("should success call batch", function(done) {
    var methods = ['math.sum', 'math.log'];
    var params = [
      [1, 9],
      [10, 12]
    ];
    tcpClient.batch(methods, params, function(err, raw) {
      should.equal(err, null);
      var obj = JSON.parse(raw);
      obj.should.deep.equal([{
        id: 5,
        jsonrpc: "2.0",
        result: 10
      }, {
        id: 6,
        jsonrpc: "2.0",
        result: 0.9266284080291269
      }]);
      done();
    });
  });
});
