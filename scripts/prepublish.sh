#!/bin/bash

[[ -x calc-versions.txt ]] && rm calc-versions.txt
[[ -d schema ]] && rm -R schema
cp ../cee/master/calc-versions.txt .
cp -R ../schema/resources/schema .
