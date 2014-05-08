#TODO rewrite without request and express modules
request = require 'request'
express = require 'express'
app = express()

class httpTransport

  constructor: (@params) ->

  send: (body, callback) ->
    opts =
      method: 'POST'
      uri: @params.uri
      body: body
    request opts, (err,res,raw) ->
      callback err, raw

  listen: (server) ->

    app.use (req, res, next) ->
      data = ""
      req.on 'data', (chunk)-> data += chunk
      req.on 'end', ->
        req.rawBody = data
        next()

    app.post '/', (req, res) ->
      console.log req.rawBody
      server.handleRequest req.rawBody, (answer) ->
        console.log answer
        res.set 'Content-Type', 'application/json'
        res.send JSON.stringify(answer)
        res.end()
    app.listen @params.port

module.exports = httpTransport