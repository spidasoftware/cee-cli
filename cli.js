#!/usr/bin/env node
'use strict';

process.on('unhandledRejection', (reason, p) => {
    console.error(reason);
    process.exit(-1);
});

const yargs = require('yargs')
    .help('h')
    .alias('h','help')
    .describe('help','Display this help')
    .usage('Usage: cee-cli <command> [opts..]\n\nRun cee-cli -h <command> for help with a specific command.')
    .command(require('./cmds/validate'))
    .command(require('./cmds/analyze'))
    .command(require('./cmds/setup'))
    .command(require('./cmds/status'))
    .command(require('./cmds/get'))
    .epilog('Copyright SPIDASoftware 2018')
    .help();

const argv = yargs.argv;

//Show help if we didn't get an expected command
if (!['validate','analyze','setup','status','get'].some(cmd => argv._.includes(cmd))) {
    yargs.showHelp();
}


