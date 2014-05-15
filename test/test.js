require('chai').should();
var expect = require('chai').expect;

var rpc = null;
describe('RPC Core', function () {
  it('should have a Client, Server, rpcError and transports', function () {
    rpc = require('../lib/jrpc2.js');
    rpc.should.respondTo('server', 'client', 'httpTransport', 'tcpTransport', 'rpcError');
  });
});

var server = null;
describe('Server', function () {

  it('should have context', function () {
    server = new rpc.server();
    server.should.have.property('context')
  });

  it('should have success function expose', function () {
    server.expose('sum', function (a, b) {
      return a + b;
    });
    server.should.have.property('methods');
    server.methods.should.have.property('sum');
    server.methods['sum'].should.be.an.instanceof(Function);
  });

  it('should have success module expose', function () {
    server.exposeModule('math', {
      log: function (num, base) {
        return Math.log(num) / Math.log(base);
      }
    });
    server.should.have.property('methods');
    server.methods.should.have.property('math.log');
    server.methods['math.log'].should.be.an.instanceof(Function);
  });

  it('should return correct results with new methods', function () {
    server.methods['sum'](14, 28).should.equal(42);
    server.methods['math.log'](10, 10).should.equal(1);
    server.methods['math.log'](10, Math.E).should.equal(2.302585092994046);
  });

  it('should correct work with context', function () {
    server.expose('getName', function () {
      return this.name;
    });
    var context = {
      name: "Ted"
    };
    server.methods['getName'].execute(context, []).should.equal("Ted");
  });

  it('should expose notification', function () {
    server.expose('console', function (message) {
      console.log(message);
    });
    server.methods.should.have.property('console');
    expect(server.methods['console']("Hello server")).to.be.undefined;
  });

  it('should return error incorrectRequest because of wrong json', function () {
    var callback = function (result) {
      result.should.deep.equal({id: null, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}});
    }
    server.handleRequest('{is:those, "last.fm":>}', {}, callback);
  });

  it('should return error incorrectRequest because of no quotes of fields', function () {
    var callback = function (result) {
      result.should.deep.equal({id: null, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}});
    }
    server.handleRequest('{id: 1, method: "sum", params: [1,3]}', {}, callback);
  });

  it('should return error incorrectRequest because of no jsonrpc field', function () {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}});
    }
    server.handleRequest('{"id": 1, "method": "sum", "params": [1,3]}', {}, callback);
  });

  it('should return error incorrectRequest because of jsonrpc not equal 2.0', function () {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}});
    }
    server.handleRequest('{"id": 1, "jsonrpc":"1.0", "method": "sum", "params": [1,3]}', {}, callback);
  });

  it('should return error incorrectRequest because of no method field', function () {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}});
    }
    server.handleRequest('{"id": 1, "jsonrpc":"2.0", "params": [1,3]}', {}, callback);
  });

  it('should return error methodNotFound in request', function () {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', error: {code: -32601, message: 'MethodNotFound'}});
    }
    server.handleRequest('{"id": 1, "jsonrpc":"2.0", "method": "bear" }', {}, callback);
  });

  it('should work with positional params', function () {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', result: 15});
    }
    server.handleRequest('{"id": 1, "jsonrpc":"2.0", "method": "sum", "params": [3, 12] }', {}, callback);
  });

  it('should work with named params', function () {
    var callback = function (result) {
      result.should.deep.equal({id: 1, jsonrpc: '2.0', result: 0.9266284080291269});
    }
    server.handleRequest('{"id": 1, "jsonrpc":"2.0", "method": "math.log", "params": {"num":10,"base":12} }', {}, callback);
  });

  it('should return error on empty batch', function () {
    var callback = function (result) {
      result.should.deep.equal({id: null, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}});
    }
    server.handleRequest('[]', {}, callback);
  });

  it('should return error on invalid batch', function () {
    var callback = function (result) {
      result.should.deep.equal([{id: null, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}},{id: null, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}},{id: null, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}}]);
    }
    server.handleRequest('[1,2,3]', {}, callback);
  });

  it('should correct work with batch', function () {
    var callback = function (result) {
      result.should.deep.equal([{id: 1, jsonrpc: '2.0', result: 29},{id: 2, jsonrpc: '2.0', result: 1.4159758378145286}]);
    }
    server.handleRequest('[{"id": 1, "jsonrpc":"2.0", "method": "sum", "params": [13, 16] },{"jsonrpc":"2.0", "method": "console", "params": ["Test batch"]},{"id": 2, "jsonrpc":"2.0", "method": "math.log", "params": {"num":19,"base":8} }]', {}, callback);
  });

});