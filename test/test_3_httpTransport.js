var should = require("chai").should();
var fs = require("fs");
var rpc = require("../lib/jrpc2");
var common = require("./common");
var sessionId = common.sessionId;
var server = common.server;
var httpsTransport = null;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";


describe("httpsServer", function() {

  it("should throw error because of no params", function() {
    (function() {
      new rpc.httpTransport();
    }).should.throw(Error);
  });

  it("should correct save params", function() {
    server.checkAuth = common.defaultCheckAuth;
    httpsTransport = new rpc.httpTransport({
      port: 8443,
      ssl: false
    });
    httpsTransport.should.have.property("params");
    httpsTransport.should.have.property("http");
    httpsTransport.params.should.deep.equal({
      port: 8443,
      ssl: false
    });
  });


  it("should throw error because of no key+cert", function() {
    httpsTransport.listen.should.throw(Error);
  });

  it("should throw error because of no cert", function() {
    httpsTransport.params.key = fs.readFileSync(__dirname + "/keys/ssl-key.pem");
    httpsTransport.listen.should.throw(Error);
  });

  it("should throw error because of no server", function() {
    httpsTransport.params.cert = fs.readFileSync(__dirname + "/keys/ssl-cert.pem");
    httpsTransport.listen.should.throw(Error);
  });

  it("should success listen server", function() {
    (function() {
      httpsTransport.listen(server);
    }).should.not.throw(Error);
  });
});



describe("httpsClient", function() {

  it("should throw error because of no transport", function() {
    (function() {
      new rpc.Client();
    }).should.throw(Error);
  });

  it("should have transport and id", function() {
    httpsClient = new rpc.Client(httpsTransport);
    httpsClient.should.have.property("transport");
    httpsClient.should.have.property("id");
    httpsClient.id.should.equal(0);
    httpsClient.transport.should.not.equal(null);
  });

  it("should correct generate requests", function() {
    httpsClient.request("sum", [1, "2", null]).should.deep.equal({
      id: 1,
      jsonrpc: "2.0",
      method: "sum",
      params: [1, "2", null]
    });
    httpsClient.request("console", {
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
    httpsClient.invoke('math.sum', [3, 12], function(err, raw) {
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
      done();
    });
  });

  it("should success call single method sum", function(done) {

    httpsTransport.setHeader('Cookie', 'sessionID=' + sessionId);
    httpsClient.invoke('math.sum', [5, 16], function(err, raw) {
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
    var res = httpsClient.notify("console", ["Hello httpsServer!"]);
    should.equal(res, true);
  });

  it("should success call single method math.log", function(done) {

    httpsClient.invoke('math.log', [10, 12], function(err, raw) {
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
    httpsClient.batch(methods, params, function(err, raw) {
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
