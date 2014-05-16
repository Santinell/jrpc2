#!/bin/sh
coffee -c -o lib src
find lib/ -name "*.js" -exec sed -i 's/.coffee/.js/g' {} \;
mocha -R spec
