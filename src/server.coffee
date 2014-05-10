fs = require 'fs'
async = require 'async'
rpcError = require('./rpcError.coffee')

Function::execute = ->
  if arguments[0] instanceof Array
    this.apply null, arguments[0]
  else
    args = this.toString().match(/function[^(]*\(([^)]*)\)/)[1].split(/,\s*/)
    named_params = arguments[0]
    params = [].slice.call arguments, 0, -1
    if params.length < args.length
      for arg in args
        params.push named_params[arg]
    this.apply(null, params)

class server

  methods: {}

  exposeModule: (name, module) ->
    for method of module
      @methods[name + '.' + method] = module[method]

  expose: (name, func) ->
    @methods[name] = func

  loadModules: (modulesDir, callback) ->
    fs.readdir modulesDir, (err, modules) =>
      if (!err)
        for moduleFile in modules
          module = require modulesDir + moduleFile
          moduleName = moduleFile.replace('.coffee', '').replace('.js', '')
          @exposeModule moduleName, module
      if callback
        callback()

  handleRequest: (json, reply) ->
    try
      requests = JSON.parse(json)
    catch error
      return reply rpcError 'Invalid request'

    batch = 1
    if requests not instanceof Array
      requests = [requests]
      batch = 0

    calls = []
    for request in requests
      if !request.method
        reply rpcError 'Invalid request', request.id
        continue

      if !@methods[request.method]
        reply rpcError 'Method not found', request.id
        continue

      method = @methods[request.method]

      ((req) ->
        calls.push (callback) =>
          result = null
          try
            result = method.execute req.params
          catch error
            return callback null, rpcError error.message, req.id

          response =
            id: req.id || 0
            jsonrpc: '2.0'
            result: result || null

          callback null, response
      )(request)

    async.parallel calls, (err, response) ->
      #TODO handle errors in err
      if !batch && response instanceof Array
        response = response[0]
      reply response


module.exports = server
