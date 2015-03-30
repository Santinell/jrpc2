fs = require 'fs'
async = require 'async'
extend = require 'xtend'
rpcError = require './rpcError'

class Server

  constructor: (@mode = 'callback') ->
    @methods = {}
    @methodArgs = {}
    @moduleContext = {}
    @context = {}

  expose: (name, func) ->
    @methods[name] = func
    args = func.toString().match(/function[^(]*\(([^)]*)\)/)[1]
    @methodArgs[name] = if args then args.split(/,\s*/) else []

  setModuleContext: (moduleName, module) ->
    context = {}
    for prop of module
      context[prop] = module[prop]
    @moduleContext[moduleName] = context

  getMethodContext: (methodName) ->
    context = {}
    if ~methodName.indexOf('.')
      [moduleName, _] = methodName.split '.'
      context = @moduleContext[moduleName]
    return extend(context, @context)

  exposeModule: (moduleName, module) ->
    @setModuleContext moduleName, module
    for elementName of module
      if typeof module[elementName] is 'function' && elementName isnt 'constructor'
        @expose moduleName+'.'+elementName, module[elementName]
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
    if !@methods[methodName]
      return callback rpcError.methodNotFound()
    method = @methods[methodName]
    context = @getMethodContext methodName
    context.req = req
    result = null
    try
      if params instanceof Array
        result = method.apply context, params
      else
        argNames = @methodArgs[methodName]
        args = []
        for name in argNames
          args.push params[name]
        result = method.apply context, args
    catch error
      callback error
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

  getIterator: (req) ->
    (call, done) =>
      setError = (error) ->
        done null, (callback) ->
          if error instanceof Error
            error = rpcError.abstract error.message, -32099, call.id || null
          else
            error.id = call.id || null
          callback null, error

      setSuccess = (result) ->
        done null, (callback) ->
          response =
            jsonrpc: '2.0'
            result: result || null
            id: call.id || null
          callback null, response

      setResult = (err, result) ->
        if !call.id?
          done null, null
        else
          if err?
            setError err
          else
            setSuccess result

      if call not instanceof Object
        return setError rpcError.invalidRequest()

      if !call.method || !call.jsonrpc || call.jsonrpc != '2.0'
        return setError rpcError.invalidRequest call.id

      if !@methods[call.method]
        return setError rpcError.methodNotFound call.id

      @checkAuth call, req, (trusted) =>
        if !trusted
          return setResult rpcError.abstract "AccessDenied", -32000, call.id

        @invoke req, call.method, call.params, setResult



  handleCall: (json, req, reply) ->
    if typeof json is "string"
      try
        calls = JSON.parse json
      catch error
        return reply rpcError.invalidRequest()
    else
      calls = json

    batch = 1
    if calls not instanceof Array
      calls = [calls]
      batch = 0
    else if calls.length is 0
      return reply rpcError.invalidRequest()

    async.map calls, @getIterator(req), (error, funcs) ->
      funcs = funcs.filter (f) -> f != null
      if funcs.length is 0
        return reply null
      async.parallel funcs, (err, response) ->
        if response.length is 0
          return reply null
        if !batch && response instanceof Array
          response = response[0]
        reply response


module.exports = Server
