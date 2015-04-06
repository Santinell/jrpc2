fs = require 'fs'
async = require 'async'
extend = require 'xtend'
rpcError = require './rpcError'

class Server

  constructor: (@methods = 'methods') ->
    @methodArgs = {}
    @modules = {}
    @context = {}

  expose: (fullName, func) ->
    args = func.toString().match(/function[^(]*\(([^)]*)\)/)[1]
    @methodArgs[fullName] = if args then args.split(/,\s*/) else []
    [moduleName, methodName] = @splitMethod fullName
    if !@modules[moduleName]
      @modules[moduleName] = {}
    @modules[moduleName][methodName] = func

  contains: (str, sub) ->
    str.indexOf(sub) isnt -1

  splitMethod: (methodName) ->
    if @contains methodName, "."
      methodName.split "."
    else
      [@methods, methodName]

  getMethodContext: (methodName) ->
    context = {}
    [moduleName, methodName] = @splitMethod methodName
    context = @modules[moduleName]
    return extend context, @context

  getMethod: (methodName) ->
    [moduleName, methodName] = @splitMethod methodName
    return @modules[moduleName][methodName]

  exposeModule: (moduleName, module) ->
    for methodName of module
      if typeof module[methodName] is "function" && methodName isnt "constructor"
        @expose moduleName+"."+methodName, module[methodName]
    return

  checkAuth: (call, req, callback) ->
    callback true

  loadModules: (modulesDir, callback) ->
    fs.readdir modulesDir, (err, modules) =>
      check = (str, sub) ->
        str.indexOf(sub) != -1
      if (!err)
        for moduleFile in modules
          if check(moduleFile,'.coffee') || check(moduleFile,'.js')
            module = require modulesDir + moduleFile
            moduleName = moduleFile.replace('.coffee', '').replace('.js', '')
            @exposeModule moduleName, module
      if callback
        callback()

  invoke: (req, methodName, params = [], callback = ->) ->
    if !@methodArgs[methodName]
      return callback rpcError.methodNotFound()
    method = @getMethod methodName
    context = @getMethodContext methodName
    context.req = req
    result = null
    if params instanceof Array
      result = method.apply context, params
    else
      argNames = @methodArgs[methodName]
      args = []
      for name in argNames
        args.push params[name]
      result = method.apply context, args
    if result? && typeof result.then is 'function'
      result.then (res) ->
        callback null, res
      , (error) ->
        callback error
    else
      if result instanceof Error
        callback result
      else
        callback null, result


  batch: (req, methods, params, finalCallback = (->)) ->
    if methods.length != params.length
      return finalCallback new Error("Wrong params"), null
    list = []
    for method, i in methods
      param = params[i]
      list.push (callback) =>
        @invoke req, method, param, callback
    async.series list, finalCallback


  handleSingle: (call, req, callback) ->

    setError = (error) ->
      if error instanceof Error
        error = rpcError.abstract error.message, -32099, call.id || null
      else
        error.id = call.id || null
      callback error

    setSuccess = (result) ->
      response =
        jsonrpc: '2.0'
        result: result || null
        id: call.id || null
      callback response

    setResult = (err, result) ->
      if !call.id?
        callback null
      else
        if err?
          setError err
        else
          setSuccess result

    if call not instanceof Object
      return setError rpcError.invalidRequest()

    if !call.method || !call.jsonrpc || call.jsonrpc != '2.0'
      return setError rpcError.invalidRequest call.id

    if !@methodArgs[call.method]
      return setError rpcError.methodNotFound call.id

    @checkAuth call, req, (trusted) =>
      if !trusted
        return setResult(rpcError.abstract "AccessDenied", -32000, call.id)
      @invoke req, call.method, call.params, setResult


  handleBatch: (calls, req, callback) ->
    if calls.length is 0
      return callback rpcError.invalidRequest()

    iterate = (call, done) =>
      @handleSingle call, req, (res) -> done null, res

    async.map calls, iterate, (err, results) ->
      callback results.filter (v) -> v?

  handleCall: (json, req, reply) ->
    if typeof json is "string"
      try
        call = JSON.parse json
      catch error
        return reply rpcError.invalidRequest()
    else
      call = json
    if call not instanceof Array
      @handleSingle call, req, reply
    else
      @handleBatch call, req, reply

module.exports = Server
