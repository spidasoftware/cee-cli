#!/bin/bash

VERSION=9.2.1
MY_PATH=${BASH_SOURCE%/*}

npm install

[[ -x $MY_PATH/calc-versions.txt ]] || cp $MY_PATH/../cee/master/calc-versions.txt .
[[ -d $MY_PATH/schema ]] || cp -R $MY_PATH/../schema/resources/schema .

for os in linux macos win; do 
	for arch in x64 x86; do
		echo Building $os-$arch
		mkdir -p target/$os/$arch 2> /dev/null
		pkg -t node$VERSION-$os-$arch --out-path target/$os/$arch .
	done
done
