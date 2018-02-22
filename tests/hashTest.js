#!/usr/bin/env node
const { hash, serialize, numberFormatter } = require('../lib/hasher.js');

const testNumbers = [0,-1,-0,1,2,-2,-0.5,0.5,0.01,-0.01,1/3,-1/3,1/9,-1/9,1.3357311409563624,15.555555555555555];
const correctFormats = ['0E0', '-1E0', '0E0', '1E0', '2E0', '-2E0', '-5E-1', '5E-1', '1E-2', '-1E-2', '3.333333333333E-1', '-3.333333333333E-1', '1.111111111111E-1', '-1.111111111111E-1', '1.335731140956E0', '1.555555555556E1'];

let success = true;
testNumbers.forEach((v,i) => {
    if (numberFormatter(v) !== correctFormats[i]) {
        console.log(`${numberFormatter(v)} !== ${correctFormats[i]}`);
        success = false;
    }
});

const { clientItems, hashes } = require('./hashTestData.json');
clientItems.forEach((v,i) => {
    const correctHash = hashes[i];
    const actualHash = hash(v);
    if (correctHash !== actualHash) {
        console.log(`${JSON.stringify(v)}\n--Serializes to:--\n${serialize(v)}\n----------------\nhashes to ${actualHash} not ${correctHash}\n\n`);
        success = false;
    }
});

if (success) {
    console.log('PASS');
} else {
    console.log('FAIL');
    process.exit(-1);
}
