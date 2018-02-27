'use strict';

const Promise = require('bluebird');
const request = Promise.promisify(require('request'));

const api = require('../lib/api');

const command = 'status [jobId..]';
const desc = 'Display status for jobs';

module.exports = {
    command,
    desc,
    builder: yargs => yargs
        .usage(`Usage: cee-cli ${command}\n\n${desc}`)
        .describe('config','config file')
        .alias('f','config')
        .default('config',api.defaultConfigPath),
    handler: argv =>
        api.loadConfig(argv.config).then(config =>
            request({
                url: config.server + '/job/status',
                proxy: config.proxy,
                headers: {
                    'User-Agent': 'cee-cli',
                    'Accept': 'application/json'
                },
                qs: {
                    apiToken: config.apiToken,
                    ids: JSON.stringify(argv.jobId)
                },
                gzip: true
            }).then(response => 
                JSON.parse(response.body).forEach(job => 
                    console.log(`${job.id} -- ${job.status}`)
                ) 
            )
        )
};
