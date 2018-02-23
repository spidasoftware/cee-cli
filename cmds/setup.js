'use strict';

const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const prompt = Promise.promisifyAll(require('prompt'));

const { defaultConfigPath } = require('../lib/api');

const configProps = ['server','clientID','clientSecret'];
const promptSchema = {
    properties: {
        server: {
            type: 'string',
            required: true,
            description: 'CEE URL',
            "default": 'https://cee.spidastudio.com'
        },
        apiToken: {
            type: 'string',
            required: true,
            description: 'SPIDAMin API Token for authentication',
            message: 'Please enter your SPIDAMin API Token (Can be found on the Usersmaster profile page)'
        },
        proxy: {
            type: 'string',
            required: false,
            description: 'Proxy URL (<proto>://<user>:<password>@<host>:<port>)'
        }
    }
};

const command = 'setup';
const desc = 'Setup CEE connection information';

module.exports = {
    command,
    desc,
    builder: yargs => yargs
        .usage(`Usage: cee-cli ${command}\n\n${desc}`)
        .boolean('new')
        .describe('config','Config file location')
        .describe('new','Force new config file')
        .describe('keep',"Don't overwrite an existing file")
        .alias('n','new')
        .alias('f','config')
        .alias('k','keep')
        .default('config',defaultConfigPath),
    handler: argv => {
        const path = argv.config;

        prompt.start();
        prompt.message = 'Please enter';

        let loadOldFile;
        if (argv.new) {
            loadOldFile = Promise.resolve();
        } else {
            loadOldFile = fs.readFileAsync(path)
                .then(file => {
                    if (argv.keep) {
                        console.log('Not overwriting existing file. Exiting');
                        process.exit(0);
                    }
                    return file;
                })
                .then(JSON.parse)
                .then(existingConfig => 
                    configProps.forEach(prop => {
                        if (existingConfig[prop] && promptSchema.properties[prop]) {
                            promptSchema.properties[prop].default = existingConfig[prop];
                        }
                    })
                )
                .catch(err => {
                    if (err.code === 'ENOENT') {
                        console.log(`Creating new config file at ${path}`);
                    } else {
                        throw err;
                    }
                })
        }

        loadOldFile
          .then(() => prompt.getAsync(promptSchema))
          .then(config => fs.writeFileAsync(path, JSON.stringify(config)))
          .then(() => console.log(`Config written to ${path}`));

    }
};
