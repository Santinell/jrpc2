users = {

  auth: (login, password) ->
    if login is 'admin' && password is 'swd'
      return 'Hello admin'
    else
      throw new Error 'Неверный логин или пароль'

}

module.exports = users