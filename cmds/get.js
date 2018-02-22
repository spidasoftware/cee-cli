'use strict';

const Promise = require('bluebird');
const request = Promise.promisify(require('request'));
const fs = Promise.promisifyAll(require('fs'));
const mkdirp = Promise.promisify(require('mkdirp'));
const path = require('path');
const _ = require('lodash');

const api = require('../lib/api');

const command = 'get [jobId..]';
const desc = 'Get jobs, unless stdout is specified.  Jobs will be written to files in the directory specified by the output parameter.';

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
                jobIdsP = request({
                    url: config.server + '/api/jobs',
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
                }).then(resp => JSON.parse(resp.body).data.map(j => j.id));
            } else {
                jobIdsP = Promise.resolve(argv.jobIds);
            }

            return jobIdsP.then(allJobIds =>
                Promise.all(_.chunk(allJobIds, 100).map(jobIds =>
                    request({
                        url: config.server + '/job',
                        headers: {
                            'User-Agent': 'cee-cli',
                            'Accept': 'application/json'
                        },
                        qs: {
                            apiToken: config.apiToken,
                            ids: JSON.stringify(jobIds)
                        },
                        gzip: true
                    })
                ))
            ).then(responses => {
                const jobs = _.flatten(responses.map(r => JSON.parse(r.body)));
                if (argv.stdout) {
                    console.log(JSON.stringify(jobs));
                } else {
                    const output = api.resolveOutputPath(argv.output);
                    return mkdirp(output).then(() => 
                        Promise.all(jobs.map(job => {
                            const name = ((!argv.id && job.externalId) || job.id) + '.json';

                            return fs.writeFileAsync(path.join(output,name),JSON.stringify(argv.strip ? job.payload : job));
                        }))
                    ).then(() => console.log(`Done. Output written to ${output}.`));
                }
            })
        })
};
