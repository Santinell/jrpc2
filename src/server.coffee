fs = require 'fs'
async = require 'async'
extend = require "xtend"
rpcError = require './rpcError'

class server

  constructor: (@mode = 'callback') ->
    @methods = {}
    @modules = {}
    @method_args = {}
    @context = {}

  fillArgs: (name, func) ->
    args = func.toString().match(/function[^(]*\(([^)]*)\)/)[1]
    @method_args[name] = if args then args.split(/,\s*/) else []

  expose: (name, func) ->
    @methods[name] = func
    @fillArgs name, func

  exposeModule: (module_name, module) ->
    @modules[module_name] = module
    for element_name of module
      if typeof module[element_name] is 'function' && element_name isnt 'constructor'
        @fillArgs module_name+'.'+element_name, module[element_name]
    return

  getMethod: (name) ->
    if ~name.indexOf('.')
      [module, method_name] = name.split "."
      if @modules[module]? && @modules[module][method_name]?
        [@modules[module], @modules[module][method_name]]
      else
        false
    else if @methods[name]?
      [null, @methods[name]]
    else
      false

  checkAuth: (call, callback) ->
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


  invoke: (context, method_name, params = [], callback = ->) ->
    [module, method] = @getMethod method_name
    if !method
      return callback rpcError.methodNotFound()
    result = null
    try
      if params instanceof Array
        result = method.apply extend(module, context), params
      else
        arg_names = @method_args[method_name]
        args = []
        for name in arg_names
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


  batch: (context, methods, params, final_callback = (->)) ->
    if methods.length != params.length
      return final_callback new Error("Wrong params"), null
    list = []
    for method, i in methods
      param = params[i]
      list.push (callback) =>
        @invoke context, method, param, callback
    async.series list, final_callback



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

      context = extend {req: req}, @context

      @checkAuth.call context, call, (trusted) =>
        if !trusted
          return setResult rpcError.abstract "AccessDenied", -32000, call.id

        @invoke context, call.method, call.params, setResult



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


module.exports = server
