#!/bin/bash

RETVAL=0

for test in ./tests/*.js; do
	echo -n $test '-> '
	node $test
	((RETVAL|=$?))
done

if [[ $RETVAL == '0' ]]; then
	echo 'All tests passed.'
else 
	echo 'Tests failed.'
fi

exit $RETVAL
