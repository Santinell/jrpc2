fs = require 'fs'
async = require 'async'
extend = require "xtend"
rpcError = require './rpcError'

Function::execute = (scope, argsList = []) ->
  if argsList instanceof Array
    this.apply scope, argsList
  else
    args = this.toString().match(/function[^(]*\(([^)]*)\)/)[1].split(/,\s*/)
    params = [].slice.call argsList, 0, -1
    if params.length < args.length
      for arg in args
        params.push argsList[arg]
    this.apply(scope, params)

class server

  methods: {}

  constructor: () ->
    @context = {}

  exposeModule: (name, module) ->
    for method of module
      @methods[name + '.' + method] = module[method]

  expose: (name, func) ->
    @methods[name] = func

  checkAuth: (method, params, headers, locals) ->
    true

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

  localCall: (method_name, params, callback = (->), from_ip = '127.0.0.1') ->
    @context.ip = from_ip
    method = @methods[method_name]
    try
      result = method.execute @context, params
    catch error
      if error instanceof Error
        return callback error.message
      else
        return callback error
    if result? && typeof result.then is 'function'
      result.then (res) ->
        callback null, res
      , (error) ->
        callback error.message
    else
      callback null, result


  localBatch: (methods, params, final_callback, from_ip = '127.0.0.1') ->
    list = []
    for method, i in methods
      list.push (callback) =>
        @localCall method, params[i], callback, from_ip
    async.series list, final_callback


  callPush: (req, headers, done) ->
    done null, (callback) =>
      method = @methods[req.method]
      requestDone = (result) ->
        response =
          jsonrpc: '2.0'
          result: result || null
        if req.id
          response.id = req.id
        callback null, response

      try
        result = method.execute extend(@context, headers), req.params
      catch error
        if error instanceof Error
          return callback null, rpcError.abstract error.message, -32099, req.id #if method throw common Error
        else
          error.id = req.id
          return callback null, error #if method throw rpcError

      if result? && typeof result.then is 'function'
        result.then requestDone, (error) ->
          callback null, rpcError.abstract error.message, -32099, req.id
      else
        requestDone result


  getCalls: (requests, headers, afterGenerate) ->
    checkRequestFields = (request) ->
      res = true
      if !request.method
        res = false
      if !request.jsonrpc
        res = false
      if request.jsonrpc != '2.0'
        res = false
      res

    iterator = (request, done) =>
      if request not instanceof Object
        done null,(callback) ->
          callback null, rpcError.invalidRequest()
        return

      check = checkRequestFields request
      if check != true
        if !request.id
          done null, null
        else
          done null,(callback) ->
            callback null, rpcError.invalidRequest request.id
        return

      if !@methods[request.method]
        if !request.id
          done null, null
        else
          done null,(callback) ->
            callback null, rpcError.methodNotFound request.id
        return

      afterAuth = (res) =>
        if res != true
          if !request.id
            done null, null
          else
            done null,(callback) ->
              callback null, rpcError.abstract "AccessDenied", -32000, request.id
            return

        if request.id
          @callPush request, headers, done
        else
          try
            method = @methods[request.method]
            method.execute extend(@context, headers), request.params
          finally
            done null, null

      res = @checkAuth request.method, request.params, headers
      if res? && typeof res.then is 'function'
        res.then afterAuth, (error) ->
          done null,(callback) ->
            callback null, rpcError.abstract error.message, -32099, request.id
      else
        afterAuth res

    async.map requests, iterator, afterGenerate


  handleRequest: (json, headers, reply) ->
    if typeof json is "string"
      try
        requests = JSON.parse(json)
      catch error
        return reply rpcError.invalidRequest()
    else
      requests = json

    batch = 1
    if requests not instanceof Array
      requests = [requests]
      batch = 0
    else if requests.length is 0
      return reply rpcError.invalidRequest()

    @getCalls requests, headers, (error, calls) ->
      calls = calls.filter (f) -> f != null
      if calls.length is 0
        return reply null
      async.parallel calls, (err, response) ->
        if response.length is 0
          return reply null
        if !batch && response instanceof Array
          response = response[0]
        reply response


module.exports = server
