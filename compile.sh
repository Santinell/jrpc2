#!/bin/sh
coffee -c -o lib src
coffee -c test
mocha -R spec
