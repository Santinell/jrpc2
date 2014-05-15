require('chai').should();

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
  it('new methods must return correct results', function () {
    server.methods['sum'](14, 28).should.equal(42);
    server.methods['math.log'](10, 10).should.equal(1);
    server.methods['math.log'](10, Math.E).should.equal(2.302585092994046);
  });
  it('context must be correct', function () {
    server.expose('getName', function () {
      return this.name;
    });
    var context = {
      name: "Ted"
    };
    server.methods['getName'].execute(context,[]).should.equal("Ted");
  });
});