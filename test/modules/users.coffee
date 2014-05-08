users = {

  auth: (login, password) ->
    if login is 'admin' && password is 'swd'
      return 'Hello admin'
    else
      throw new Error 'Wrong login or password'

}

module.exports = users