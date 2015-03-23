fs = require 'fs'
async = require 'async'
extend = require "xtend"
rpcError = require './rpcError'

execute = (scope, func, argsList = []) ->
  if argsList instanceof Array
    func.apply scope, argsList
  else
    args = func.toString().match(/function[^(]*\(([^)]*)\)/)[1].split(/,\s*/)
    params = [].slice.call argsList, 0, -1
    if params.length < args.length
      for arg in args
        params.push argsList[arg]
    func.apply(scope, params)

class server

  methods: {}

  constructor: (@mode = 'callback') ->
    @context = {}

  checkFunc: (func) ->
    func.toString().match(/this\.callback\(/) isnt null

  expose: (name, func) ->
    if @mode is 'promise' || @checkFunc func
      @methods[name] = func
    else
      throw new Error "In method "+name+", using of this.callback not found"

  exposeModule: (module_name, module) ->
    for element_name of module
      if typeof module[element_name] is 'function' && element_name isnt 'constructor'
        @expose(module_name+'.'+element_name, module[element_name])
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


  promisedExecute: (method, params, callback) ->
    try
      result = execute {}, method, params
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

  invoke: (method_name, params, callback = (->)) ->
    method = @methods[method_name]
    if !method?
      return callback "Method not found"
    if @mode is 'callback'
      execute {"callback": callback}, method, params
    else
      @promisedExecute method, params, callback


  batch: (methods, params, final_callback = (->)) ->
    if methods.length != params.length
      return final_callback new Error("Wrong params"), null
    list = []
    for method, i in methods
      param = params[i]
      list.push (callback) =>
        @invoke method, param, callback
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

      context = {}
      if @mode is 'callback'
        context.callback = setResult
      context = extend context, req, @context

      if call not instanceof Object
        return setError rpcError.invalidRequest()

      if !call.method || !call.jsonrpc || call.jsonrpc != '2.0'
        return setError rpcError.invalidRequest call.id

      if !@methods[call.method]
        return setError rpcError.methodNotFound call.id

      method = @methods[call.method]
      @checkAuth.call context, call, req, (trusted) =>
        if !trusted
          return setResult rpcError.abstract "AccessDenied", -32000, call.id

        if @mode is 'callback'
          execute method, context, call.params
        else
          @promisedExecute method, context, call.params, setResult



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
