'use strict';

const Promise = require('bluebird');
const { requestAndRetry } = require('../lib/retrier');
const fs = Promise.promisifyAll(require('fs'));
const mkdirp = Promise.promisify(require('mkdirp'));
const path = require('path');
const _ = require('lodash');

const api = require('../lib/api');

const command = 'get [jobIds..]';
const desc = 'Get jobs, unless stdout is specified.  Jobs will be written to files in the directory specified by the output parameter.  Jobs can be specified by id or using --offset and --limit to get the last x (--limit) jobs starting at job y (--offset).';

module.exports = {
    command,
    desc,
    builder: yargs => yargs
            .usage(`Usage: cee-cli ${command}\n\n${desc}`)
            .boolean('stdout')
            .boolean('strip')
            .describe('config','Config file')
            .describe('stdout',"Don't write to files, instead write as JSON Array to standard out")
            .describe('output','Directory to write jobs to (ignored if stdout is specified')
            .describe('id', 'Force filename to be job id, (otherwise attempt to use external id)')
            .describe('strip', 'Prepare job for sending to CEE again strip out everything but analysis')
            .describe('jobIds', 'A json array of jobIds to request does nothing if offset is specified')
            .describe('limit', 'Get this many jobs (don\'t use with jobIds)')
            .describe('offset', 'Get jobs starting at this offset')
            .alias('f','config')
            .alias('c','stdout')
            .alias('o','output')
            .alias('s','strip')
            .default('config',api.defaultConfigPath)
            .default('limit',50)
            .default('output','results'),
    handler: argv =>
        api.loadConfig(argv.config).then(config => {
            let jobIdsP;

            if (typeof argv.offset !== 'undefined') {
                jobIdsP = requestAndRetry({
                    url: config.server + '/api/jobs',
                    proxy: config.proxy,
                    headers: {
                        'User-Agent': 'cee-cli',
                        'Accept': 'application/json'
                    },
                    qs: {
                        apiToken: config.apiToken,
                        limit: argv.limit,
                        offset: argv.offset
                    },
                    gzip: true
                }, (resp) => {
                    try {
                        return JSON.parse(resp.body).data.map(j => j.id);
                    } catch(e) {
                        console.log(`Failed to get jobs at offset: ${resp.body}`)
                        throw e;
                    }
                });
            } else {
                jobIdsP = Promise.resolve(argv.jobIds);
            }

            return jobIdsP.then(allJobIds =>
                Promise.all(_.chunk(allJobIds, 100).map(jobIds =>
                    requestAndRetry({
                        url: config.server + '/job',
                        proxy: config.proxy,
                        headers: {
                            'User-Agent': 'cee-cli',
                            'Accept': 'application/json'
                        },
                        qs: {
                            apiToken: config.apiToken,
                            ids: JSON.stringify(jobIds)
                        },
                        gzip: true
                    }, (response) => {
                        try {
                            return JSON.parse(response.body);
                        } catch(e) {
                            console.log(`Failed to get jobs: ${response.body}`)
                            throw e;
                        }
                    })
                ))
            ).then(bodies => {
                const jobs = _.flatten(bodies);
                if (argv.stdout) {
                    console.log(JSON.stringify(jobs));
                } else {
                    const output = api.resolveOutputPath(argv.output);
                    return mkdirp(output).then(() => 
                        Promise.all(jobs.map(job => {
                            const name = ((!argv.id && job.externalId) || job.id);

                            if (!name.endsWith('.json')) {
                                name = name + '.json';
                            }

                            return fs.writeFileAsync(path.join(output,name),JSON.stringify(argv.strip ? job.payload : job));
                        }))
                    ).then(() => console.log(`Done. Output written to ${output}.`));
                }
            })
        })
};
