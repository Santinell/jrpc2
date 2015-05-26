npm run build && npm run mocha | grep 'failures\": \[\]' >/dev/null && npm publish || echo 'Errors found'
