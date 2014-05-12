#!/bin/sh
find src/ -name "*.coffee" -exec coffee -o lib/ -c {} \;
