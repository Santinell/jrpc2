var should = require("chai").should();
var rpc = require("../lib/jrpc2");

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
