const path = require('path');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));

const isWin = /^win/.test(process.platform);
const baseConfigPath = isWin ? process.env.APPDATA : path.join(process.env.HOME,'.config');

module.exports = {
    isWin,
    baseConfigPath,
    defaultConfigPath: path.join(baseConfigPath,'cee.json'),

    resolveOutputPath(dir) {
        if (path.isAbsolute(dir)) {
            return dir;
        } else {
            return path.join(process.cwd(),dir);
        }
    },

    loadConfig(path) {
        return fs.readFileAsync(path)
            .then(JSON.parse)
            .catch(err => {
                if (err.code === 'ENOENT') {
                    console.log(`Unable to find config file at ${path}.  Run cee-cli setup to configure.`);
                }
                throw err;
            });
    }
}

