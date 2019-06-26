'use strict';

const Promise = require('bluebird');
const request = Promise.promisify(require('request'));

const REQUEST_RETRY_COUNT = 5;
const RETRY_TIMEOUT_MS = 30000;
const REQUEST_TIMEOUT_MS = 60000;

function rejectDelay() {
    return new Promise(function(resolve, reject) {
        setTimeout(resolve, RETRY_TIMEOUT_MS);
    })
}

function requestAndRetry(requestParams, responseHandler = (response) => response, retryCount = 0){
	requestParams.timeout = REQUEST_TIMEOUT_MS;
    return request(requestParams).then(responseHandler).catch((err) => {
        if(retryCount < REQUEST_RETRY_COUNT){
            console.log(`Could not complete last request. Retrying: ${retryCount+1}/${REQUEST_RETRY_COUNT}`)
            return rejectDelay().then(() => requestAndRetry(requestParams, responseHandler, ++retryCount));
        } else {
            console.log("Could not complete action.");
            throw err
        }
    });
}

module.exports = {
    requestAndRetry
};
