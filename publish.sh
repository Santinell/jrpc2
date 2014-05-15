#!/bin/sh
find src/ -name "*.coffee" -exec coffee -o lib/ -c {} \;
find lib/ -name "*.js" -exec sed -i 's/.coffee/.js/g' {} \;
mocha -R json | grep '"failures": \[\]' >/dev/null && npm publish || echo "Errors found"
