logs = {

  userLogout: (timeOnSite, lastPage) ->
    #write logs into DB
    console.log "User spend "+timeOnSite+" sec. on site, and last page was: "+lastPage

}

module.exports = logs