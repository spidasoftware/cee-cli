'use strict';

const { requestAndRetry } = require('../lib/retrier');
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
            requestAndRetry({
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
            }, (response) => {
                try {
                    JSON.parse(response.body).forEach(job => 
                        console.log(`${job.id} -- ${job.status}`)
                    )
                } catch(e) {
                    console.log(`Failed to get job status: ${response.body}`)
                    throw e;
                }
            })
        )
};
