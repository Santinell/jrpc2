npm build && mocha -R json | grep 'failures\": \[\]' >/dev/null && npm publish || echo 'Errors found'
