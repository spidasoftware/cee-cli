const Promise = require('bluebird');
const request = Promise.promisify(require('request'));
const fs = Promise.promisifyAll(require('fs'));

module.exports = {
    loadConfig(path) {
        if (path.includes('$HOME')) {
            path = path.replace('$HOME',process.env.HOME);
        }

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

