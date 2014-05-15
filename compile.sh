#!/bin/sh
find src/ -name "*.coffee" -exec coffee -o lib/ -c {} \;
find lib/ -name "*.js" -exec sed -i 's/.coffee/.js/g' {} \;
mocha -R spec
