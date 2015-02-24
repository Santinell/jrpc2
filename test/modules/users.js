var users = {
  auth: function (login, password) {
    if (login === 'admin' && password === 'swd')
      this.callback(null, {sessionID: '9037c4852fc3a3f452b1ee2b93150603'});
    else
      this.callback(new Error('Wrong login or password');
  }
};

module.exports = users;
