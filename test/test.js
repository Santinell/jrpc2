var chai;

chai = require('chai');

chai.should();

describe('RPC Core', function() {
    var rpc;
    rpc = null;
    return it('should have a Client, Server and transports', function() {
        rpc = require('../lib/jrpc2.js');
        rpc.should.respondTo('server', 'client', 'httpTransport', 'tcpTransport');
    });
});