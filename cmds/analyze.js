'use strict';

const BATCH_SIZE = 100;

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

const api = require('../lib/api');
const { loadClientItems } = require('../lib/clientData');

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
        .describe('clientData', 'File containing client data (expect json args to be a structure only; requires analysisCase)')
        .describe('analysisCase','File containing analysis case (expect json args to be a structure only; requires clientData)')
        .alias('f','config')
        .alias('p','poll')
        .alias('b','callback')
        .alias('a','array')
        .alias('o','output')
        .alias('j','job') 
        .alias('v','engineVersion')
        .alias('d','clientData')
        .alias('c','analysisCase')
        .default('config',api.defaultConfigPath)
        .default('output','results')
        .default('engineVersion', '7.0.1'),
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
                qs: { apiToken: config.apiToken, status, ids: JSON.stringify(jobIds.slice(0,BATCH_SIZE)) },
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

function displayProgress(validCount,startedCount,finishedCount) {
    console.log(`[${new Date()}]: ${validCount}/${startedCount}/${finishedCount}`);
}

function showProgress(jobIds,argv,config) {
    const unstartedJobs = jobIds;
    const unfinishedJobs = unstartedJobs.slice(); //Make a copy of unstartedJobs

    let validCount=jobIds.length;
    let finishedCount=0;
    let startedCount=0;

    console.log('Jobs Total/Started/Finished');
    displayProgress(validCount, startedCount, finishedCount);

    const output = api.resolveOutputPath(argv.output);
    return mkdirp(output).then(() =>
        Promise.all([
            pollFor(unstartedJobs, 'STARTED', config, jobIds => {
                startedCount+=jobIds.length;
                displayProgress(validCount, startedCount, finishedCount);
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
                            fs.writeFileAsync(path.join(output,result.externalId),JSON.stringify(result))
                        )
                    ).then(() => {
                        finishedCount+=jobIds.length;
                        displayProgress(validCount, startedCount, finishedCount);
                    })
                ).catch(e =>
                    Promise.reject(`Unable to get or write job data for ${jobIds}: (${e})`)
                )
            )
        ])
    );
}

function resolvePayload(partialPayloadP, structure) {
    return partialPayloadP.then(partialPayload => {
        const { analysisCase, clientItems } = partialPayload;

        return {
            analysisCase,
            structure,
            clientData: clientItems.clientItemsForStructure(structure)
        };
    });
}


function batchJobs(argv) {
    const batch = _.partialRight(_.chunk,BATCH_SIZE);

    let partialPayload;
    if (argv.clientData || argv.analysisCase) {
        if (argv.clientData && argv.analysisCase) {
            partialPayload = Promise.props({
                analysisCase: fs.readFileAsync(argv.analysisCase).then(JSON.parse),
                clientItems: loadClientItems(argv.clientData)
            });
        } else {
            throw 'Both or neither of --clientData and --analysisCase must be specified'
        }
    }

    return Promise.all(argv.json.map(file => 
        fs.readFileAsync(file)
          .then(JSON.parse)
          .then(analysis => {
            if (argv.job) {
                return analysis;
            } else {
                file=file.split(path.sep).join('-');
                let analysisP;
                if (argv.array) {
                    analysisP = Promise.all(analysis.map((payload, i) => Promise.props({
                        engineVersion: argv.engineVersion,
                        callbackUrl: argv.callback,
                        externalId: `${i}.${file}`,
                        label: `CLI Job ${i} from ${file}`,
                        payload: partialPayload ? resolvePayload(partialPayload, payload) : payload
                    })));
                } else {
                    analysisP = Promise.props({
                        engineVersion: argv.engineVersion,
                        callbackUrl: argv.callback,
                        externalId: file,
                        label: `CLI Job from ${file}`,
                        payload: partialPayload ? resolvePayload(partialPayload, analysis) : analysis
                    });
                }

                return analysisP.catch(e =>
                    Promise.reject(`Could not process file: ${file} (${e})`)
                );
            }
        })
    ))
    .then(_.flatten)
    //Workaround for #155413204
    .then(jobs =>
        jobs.map(job => {
            if (!job.payload.structure.wireEndPoints) {
                job.payload.structure.wireEndPoints=[];
            }

            if (!job.payload.clientData.wires) {
                job.payload.clientData.wires = [];
            }

            return job;
        })
    )
    .then(batch); 
}



