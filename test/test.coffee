should = require("chai").should()
fs = require("fs")
url = require("url")
rpc = null
server = null
transport = null
client = null

describe "RPC Core", ->
  it "should have a Client, Server, rpcError and transports", ->
    rpc = require("../lib/jrpc2.js")
    rpc.should.respondTo "server", "client", "httpTransport", "tcpTransport", "rpcError"



describe "Server", ->
  it "should have context", ->
    server = new rpc.server()
    server.should.have.property "context"

  it "should correct load modules from directory", ->
    server.loadModules __dirname + "/modules/", ->
      server.methods.should.have.property "users.auth"
      server.methods["users.auth"].should.be.an.instanceof Function

  it "should have success function expose", ->
    server.expose "sum", (a, b) -> a + b
    server.should.have.property "methods"
    server.methods.should.have.property "sum"
    server.methods["sum"].should.be.an.instanceof Function

  it "should have success module expose", ->
    server.exposeModule "math",
      log: (num, base) -> Math.log(num) / Math.log(base)
    server.should.have.property "methods"
    server.methods.should.have.property "math.log"
    server.methods["math.log"].should.be.an.instanceof Function

  it "should return correct results with new methods", ->
    server.methods["sum"](14, 28).should.equal 42
    server.methods["sum"](21.4, 33.1).should.equal 54.5
    server.methods["math.log"](10, 10).should.equal 1
    server.methods["math.log"](10, Math.E).should.equal 2.302585092994046

  it "should correct work with context", ->
    server.expose "getName", -> @name
    context = { name: "Ted" }
    server.methods["getName"].execute(context, []).should.equal "Ted"

  it "should expose notification", ->
    server.expose "console", (message) ->
      console.log "    >>" + message
    server.methods.should.have.property "console"
    should.equal server.methods["console"]("Hello server"), `undefined`

  it "should return error incorrectRequest because of wrong json", ->
    callback = (result) ->
      result.should.deep.equal {id: null, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}}
    server.handleRequest '{is:those, "last.fm":>}', {}, callback

  it "should return error incorrectRequest because of no quotes of fields", ->
    callback = (result) ->
      result.should.deep.equal {id: null, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}}
    server.handleRequest '{id: 1, method: "sum", params: [1,3]}', {}, callback

  it "should return error incorrectRequest because of no jsonrpc field", ->
    callback = (result) ->
      result.should.deep.equal {id: 1, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}}
    server.handleRequest '{"id": 1, "method": "sum", "params": [1,3]}', {}, callback

  it "should return error incorrectRequest because of jsonrpc not equal 2.0", ->
    callback = (result) ->
      result.should.deep.equal {id: 1, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}}
    server.handleRequest '{"id": 1, "jsonrpc":"1.0", "method": "sum", "params": [1,3]}', {}, callback

  it "should return error incorrectRequest because of no method field", ->
    callback = (result) ->
      result.should.deep.equal {id: 1, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}}
    server.handleRequest '{"id": 1, "jsonrpc":"2.0", "params": [1,3]}', {}, callback

  it "should return error methodNotFound in request", ->
    callback = (result) ->
      result.should.deep.equal {id: 1, jsonrpc: '2.0', error: {code: -32601, message: 'MethodNotFound'}}
    server.handleRequest '{"id": 1, "jsonrpc":"2.0", "method": "bear" }', {}, callback

  it "should work with positional params", ->
    callback = (result) ->
      result.should.deep.equal {id: 1, jsonrpc: '2.0', result: 15}
    server.handleRequest '{"id": 1, "jsonrpc":"2.0", "method": "sum", "params": [3, 12] }', {}, callback

  it "should work with named params", ->
    callback = (result) ->
      result.should.deep.equal {id: 1, jsonrpc: '2.0', result: 0.9266284080291269}
    server.handleRequest '{"id": 1, "jsonrpc":"2.0", "method": "math.log", "params": {"num":10,"base":12} }', {}, callback

  it "should return error on empty batch", ->
    callback = (result) ->
      result.should.deep.equal {id: null, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}}
    server.handleRequest '[]', {}, callback

  it "should return error on invalid batch", ->
    callback = (result) ->
      result.should.deep.equal [
        {id: null, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}},
        {id: null, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}},
        {id: null, jsonrpc: '2.0', error: {code: -32600, message: 'InvalidRequest'}}
      ]
    server.handleRequest '[1,2,3]', {}, callback

  it "should correct work with batch", ->
    callback = (result) ->
      result.should.deep.equal [
        {id: 1, jsonrpc: '2.0', result: 29},
        {id: 2, jsonrpc: '2.0', result: 1.4159758378145286}
      ]
    server.handleRequest '[{"id": 1, "jsonrpc":"2.0", "method": "sum", "params": [13, 16] },{"jsonrpc":"2.0", "method": "console", "params": ["Test batch"]},{"id": 2, "jsonrpc":"2.0", "method": "math.log", "params": {"num":19,"base":8} }]', {}, callback

  it "should correct set checkAuth function", ->
    server.checkAuth("", [], {}).should.equal true
    server.checkAuth = (method, params, headers) ->
      if method is "users.auth" #methods that don't require authorization
        true
      else
        cookies = url.parse("?" + (headers.cookie or ""), true).query
        sessionID = cookies.sessionID or ""
        sessionID is "9037c4852fc3a3f452b1ee2b93150603"
    server.checkAuth("", [], {}).should.not.equal true

  sessionId = "9037c4852fc3a3f452b1ee2b93150603"
  it "should return sessionId with right login and password", ->
    callback = (result) ->
      result.should.deep.equal {id: 1, jsonrpc: '2.0', result: {sessionID: sessionId}}
    server.handleRequest '{"id": 1, "jsonrpc":"2.0", "method": "users.auth", "params": ["admin", "swd"] }', {}, callback

  it "should return error for wrong login or password", ->
    callback = (result) ->
      result.should.deep.equal {id: 1, jsonrpc: '2.0', error: {code: -32099, message: 'Wrong login or password'}}
    server.handleRequest '{"id": 1, "jsonrpc":"2.0", "method": "users.auth", "params": ["Ted", "frisbee"] }', {}, callback

  it "should return AccessDenied for request without sessionID", ->
    callback = (result) ->
      result.should.deep.equal {id: 1, jsonrpc: '2.0', error: {code: -32000, message: 'AccessDenied'}}
    server.handleRequest '{"id": 1, "jsonrpc":"2.0", "method": "sum", "params": [1, 5] }', {}, callback

  it "should return AccessDenied for wrong sessionID", ->
    callback = (result) ->
      result.should.deep.equal {id: 1, jsonrpc: '2.0', error: {code: -32000, message: 'AccessDenied'}}
    server.handleRequest '{"id": 1, "jsonrpc":"2.0", "method": "sum", "params": [1, 5] }',
      cookie: "sessionID=123"
    , callback

  it "should return correct result with correct sessionID", ->
    callback = (result) ->
      result.should.deep.equal {id: 1, jsonrpc: '2.0', result: 6}
    server.handleRequest '{"id": 1, "jsonrpc":"2.0", "method": "sum", "params": [1, 5] }',
      cookie: "sessionID=9037c4852fc3a3f452b1ee2b93150603"
    , callback



describe "httpsTransport", ->
  it "should correct save params", ->
    transport = new rpc.httpTransport { port: 8080, ssl: true }
    transport.should.have.property "params"
    transport.should.have.property "http"
    transport.params.should.deep.equal { port: 8080, ssl: true }
  it "should throw error because of no key+cert", ->
    transport.listen.should.throw Error

  it "should throw error because of no cert", ->
    transport.params.key = fs.readFileSync(__dirname + "/keys/ssl-key.pem")
    transport.listen.should.throw Error

  it "should throw error because of no server", ->
    transport.params.cert = fs.readFileSync(__dirname + "/keys/ssl-cert.pem")
    transport.listen.should.throw Error

  it "should success listen server", ->
    (->
      transport.listen server
    ).should.not.throws Error



describe "Client", ->
  it "should have transport and id", ->
    client = new rpc.client(transport)
    client.should.have.property "transport"
    client.should.have.property "id"
    client.id.should.equal 0
    client.transport.should.not.equal null

  it "should correct generate requests", ->
    client.request("sum", [1,"2",null]).should.deep.equal {id:1, jsonrpc:"2.0", method: "sum", params:[1,"2",null]}
    client.request("console", { message: "Hello world!" }, false).should.deep.equal {jsonrpc:"2.0", method: "console", params:{message: "Hello world!"}}