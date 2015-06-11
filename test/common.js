var rpc = require("../lib/jrpc2");
var url = require("url");
var sessionId = "9037c4852fc3a3f452b1ee2b93150603";

var server = new rpc.Server();
server.exposeModule("math", {
  sum: function (a, b) {
    return a + b;
  },
  log: function (num, base) {
    return Math.log(num) / Math.log(base);
  }
});

var defaultCheckAuth = function (call, req, callback) {
  if (call.method === "users.auth" || call.method === "users.context") {
    callback(true);
  } else {
    var tmp = req?(req.headers?req.headers.cookie:""):"";
    var cookies = url.parse("?" + tmp, true).query;
    callback(cookies.sessionID === sessionId);
  }
};

exports.defaultCheckAuth = defaultCheckAuth;
exports.server = server;
exports.sessionId = sessionId;
