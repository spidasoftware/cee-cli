#!/usr/bin/env node

const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const { createClientItems } = require('../lib/clientData.js');
const path = require('path');

const testJobPath = './tests/testJobs';

fs.readdirAsync(testJobPath).then(files =>
    Promise.all(files.map(file => fs.readFileAsync(path.join(testJobPath,file)).then(JSON.parse)))
).then(jobs => {
    const success = true;
    for (let job of jobs) {
        const structure = job.payload.structure;
        const originalClientData = job.payload.clientData;
        const clientData = createClientItems(originalClientData);

        const clientItems = clientData.clientItemsForStructure(structure);

        for (let key of Object.keys(originalClientData)) {
            const expected = originalClientData[key].length;
            const actual = clientItems[key] ? clientItems[key].length : 0;

            if (expected !== actual) {
                console.log(`Expected count of ${key} to be ${expected} was ${actual} for job ${job.externalId}`);
                success=false;
            }
        }
    }

    if (success) {
        console.log('PASS');
    } else {
        console.log('FAIL');
        process.exit(-1);
    }
}).catch(e => {
    console.log(e);
    process.exit(-1);
});
