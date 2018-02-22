'use strict';

const Promise = require('bluebird');
const request = Promise.promisify(require('request'));
const fs = Promise.promisifyAll(require('fs'));
const zlib = Promise.promisifyAll(require('zlib'));
const mkdirp = Promise.promisify(require('mkdirp'));
const querystring = require('querystring');
const _ = require('lodash');
const path = require('path');
const co = require('co');
const util = require('util');

const api = require('../lib/api')

const command = 'analyze [json..]';
const desc =  'Send analysis or job in each file to CEE, then optionally poll CEE until analysis is complete  and retrieve results.  If polling is enabled analysis results will be written to a directory specified by the output parameter.';

module.exports = {
    command,
    desc,
    builder: yargs => yargs
        .usage(`Usage: cee-cli ${command}\n\n${desc}`)
        .example('cee-cli analyze -p pole1.json pole2.json')
        .boolean('job')
        .boolean('array')
        .boolean('poll')
        .boolean('array')
        .describe('poll', 'Poll CEE and write analysis results when complete')
        .describe('output', 'Analysis Result output')
        .describe('config','Config file')
        .describe('callback','Callback URL with results')
        .describe('array','Expect input files to contain an array of jobs or analyses instead of a single job or analysis')
        .describe('engineVersion', 'Version of calc to analyze against')
        .describe('job', 'Expect json files to be jobs instead of analysis (Passed callback and calcVersion will be ignored)')
        
        .alias('f','config')
        .alias('p','poll')
        .alias('b','callback')
        .alias('a','array')
        .alias('o','output')
        .alias('j','job') 
        .alias('v','engineVersion')
        .default('config','$HOME/.config/cee.json')
        .default('output','results')
        .default('engineVersion', '7.0.0-SNAPSHOT'),
    handler: argv => 
        api.loadConfig(argv.config).then(config => 
            batchJobs(argv).mapSeries(batch =>
                zlib.gzipAsync(JSON.stringify(batch))
                    .then(jobData =>
                        request({
                            url: config.server + '/job?apiToken=' + config.apiToken,
                            gzip: true,
                            method: 'POST',
                            headers: {
                                'User-Agent': 'cee-cli',
                                'Accept': 'application/json',
                                'Content-Type': 'application/json',
                                'Content-Encoding': 'gzip'
                            },
                            body: jobData
                        })
                    ).then(response => {
                        try {
                            return JSON.parse(response.body);
                        } catch (e) {
                            console.log(`Unable to parse response JSON: ${response.body}`);
                            return [];
                        }
                    })
            ).then(responses => {
                responses = _.flatten(responses);

                if (!argv.poll) {
                    console.log(JSON.stringify(responses));
                } else {
                    const jobIds = [];
                    let errors = [];

                    responses.forEach(response => {
                        if (response.success) {
                            jobIds.push(response.id);
                        } else {
                            errors.push(response.errors);
                        }
                    });

                    errors = _.flatten(errors);

                    if (errors.length > 0) {
                        console.log('The following errors occured:');
                        console.log(util.inspect(errors, { depth: null}));
                    }

                    return showProgress(jobIds,argv,config).then(() => console.log('Done.'));
                }
            })
        )
};

function pollFor(jobIds, status, config, onUpdate) {
    return co(function*() {
        while(jobIds.length > 0) {
            const response = yield request({
                url: config.server + '/job/poll',
                qs: { apiToken: config.apiToken, status, ids: JSON.stringify(jobIds) },
                gzip: true,
                headers: {
                    'User-Agent': 'cee-cli',
                    'Accept': 'application/json',
                }
            });

            const updatedJobIds = JSON.parse(response.body).map(j => j.id);

            _.pullAll(jobIds,updatedJobIds);
            const updateP = onUpdate(updatedJobIds);
            if (updateP) {
                yield updateP;
            }
        }
    });
}


function showProgress(jobIds,argv,config) {
    const unstartedJobs = jobIds;
    const unfinishedJobs = unstartedJobs.slice(); //Make a copy of unstartedJobs

    let validCount=jobIds.length;
    let finishedCount=0;
    let startedCount=0;

    console.log('Jobs Total/Started/Finished');
    console.log(`${validCount}/${startedCount}/${finishedCount}`);

    return mkdirp(argv.output).then(() =>
        Promise.all([
            pollFor(unstartedJobs, 'STARTED', config, jobIds => {
                startedCount+=jobIds.length;
                console.log(`${validCount}/${startedCount}/${finishedCount}`);
            }),
            pollFor(unfinishedJobs, 'FINISHED', config, jobIds =>
                request({
                    url: config.server + '/job',
                    qs: {
                        apiToken: config.apiToken,
                        ids: JSON.stringify(jobIds)
                    },
                    gzip: true,
                    headers: {
                        'User-Agent': 'cee-cli',
                        'Accept': 'application/json',
                    }
                }).then(response => 
                    Promise.all(
                        JSON.parse(response.body).map(result =>
                            fs.writeFileAsync(path.join(argv.output,result.externalId),JSON.stringify(result))
                        )
                    ).then(() => {
                        finishedCount+=jobIds.length;
                        console.log(`${validCount}/${startedCount}/${finishedCount}`);
                    })
                ).catch(() =>
                    console.log(`Unable to get or write job data for ${jobIds}`)
                )
            )
        ])
    );
}


function batchJobs(argv) {
    const batch = _.partialRight(_.chunk,100);

    return Promise.all(argv.json.map(file => 
        fs.readFileAsync(file)
          .then(JSON.parse)
          .then(analysis => {
            if (argv.job) {
                return analysis;
            } else {
                file=file.split('/').join('-');
                if (argv.array) {
                    return analysis.map((payload, i) => ({
                        engineVersion: argv.engineVersion,
                        callbackUrl: argv.callback,
                        externalId: `${i}.${file}`,
                        label: `CLI Job ${i} from ${file}`,
                        payload
                    }))
                } else {
                    return {
                        engineVersion: argv.engineVersion,
                        callbackUrl: argv.callback,
                        externalId: file,
                        label: `CLI Job from ${file}`,
                        payload: analysis
                    }
                }
            }
        })
    )).then(_.flatten)
    .then(batch); 
}



