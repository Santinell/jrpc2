var logs = {
  userLogout: function (timeOnSite, lastPage) {
    console.log("User spend " + timeOnSite + " sec. on site, and last page was: " + lastPage);
    this.callback();
  }
};

module.exports = logs;
