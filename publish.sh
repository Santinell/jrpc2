#!/bin/sh
coffee -c -o lib src
mocha -R json | grep '"failures": \[\]' >/dev/null && npm publish || echo "Errors found"
