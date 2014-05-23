fs = require 'fs'
async = require 'async'
rpcError = require('./rpcError')

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
  headers: {}

  constructor: () ->
    @context = @

  exposeModule: (name, module) ->
    for method of module
      @methods[name + '.' + method] = module[method]

  expose: (name, func) ->
    @methods[name] = func

  checkAuth: (method, params, headers) ->
    true

  loadModules: (modulesDir, callback) ->
    fs.readdir modulesDir, (err, modules) =>
      if (!err)
        for moduleFile in modules
          module = require modulesDir + moduleFile
          moduleName = moduleFile.replace('.coffee', '').replace('.js', '')
          @exposeModule moduleName, module
      if callback
        callback()


  callPush: (req, done) ->
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
        result = method.execute @context, req.params
      catch error
        if error instanceof Error
          return callback null, rpcError.abstract error.message, -32099, req.id #if method throw common Error
        else
          return callback null, error #if method throw rpcError

      if typeof result.then is 'function'
        result.then requestDone
      else
        requestDone result


  getCalls: (requests, afterGenerate) ->
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
        done null,(callback) =>
          callback null, rpcError.invalidRequest()
        return

      check = checkRequestFields request
      if check != true
        if request.id
          done null,(callback) =>
            callback null, rpcError.invalidRequest request.id
        return

      if !@methods[request.method]
        if request.id
          done null,(callback) =>
            callback null, rpcError.methodNotFound request.id
        return

      res = @checkAuth request.method, request.params, @headers
      afterAuth = (res) =>
        if res != true
          if request.id
            done null,(callback) =>
              callback null, rpcError.abstract "AccessDenied", -32000, request.id
          return

        if request.id
          @callPush request, done
        else
          method = @methods[request.method]
          try
            method.execute @context, request.params
          finally
          #nothig there

      if typeof res.then is 'function'
        res.then afterAuth
      else
        afterAuth res

    async.map requests, iterator, afterGenerate


  handleRequest: (json, @headers, reply) ->
    try
      requests = JSON.parse(json)
    catch error
      return reply rpcError.invalidRequest()

    batch = 1
    if requests not instanceof Array
      requests = [requests]
      batch = 0
    else if requests.length is 0
      return reply rpcError.invalidRequest()

    @getCalls requests, (error, calls) ->
      async.parallel calls, (err, response) ->
        if response.length is 0
          return reply null
        if !batch && response instanceof Array
          response = response[0]
        reply response


module.exports = server
