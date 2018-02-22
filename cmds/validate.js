'use strict';

const Promise = require('bluebird');
const ajv = require('ajv');
const fs = Promise.promisifyAll(require('fs'));
const path = require('path');

const noLog = () => {};
const log = { trace: noLog, debug: noLog, info: noLog, warn: console.log, error: console.log};
const config = {
    verbose: false,
    calcVersionsFile: 'calc-versions.txt',
    primarySchemaPath: path.join('schema','spidacalc','cee')
}

const command ='validate [json..]';
const desc =  'Validate jobs or analysis.  Validates each file against JSON schema.  If job option is specified, validation will be done against the job schema.  Otherwise validation will be done against the analysis schema.  Return code is 0 if all files validated successfully and 1 otherwise.';

module.exports = {
    command,
    desc,
    builder: yargs => yargs
        .usage(`Usage: cee-cli ${command}\n\n${desc}`)
        .count('verbose')
        .boolean('quiet')
        .boolean('job')
        .alias('v', 'verbose')
        .alias('q', 'quiet')
        .alias('j', 'job')
        .describe('verbose', 'Increase verbosity (can be used more than once)')
        .describe('quiet', "Don't output anything")
        .describe('job', 'Validate job instead of analysis'),
    handler: argv => {
        if (argv.verbose > 0) {
            log.info = console.log;
            log.debug = console.log;
            if (argv.verbose > 1) {
                log.trace = console.log;
                config.verbose = true;
            }
        } 

        Promise.all(
            validate(
                argv.json.map(file => fs.readFileAsync(file).then(JSON.parse)),
                argv.job ? 'job' : 'analysis'

            )
        ).then(results => {
            let allValid = true;
            results.forEach((result, i) => {
                if (!argv.quiet) {
                    if (result.valid) {
                        console.log(`${argv.json[i]}: VALID`)
                    } else {
                        allValid = false;
                        console.log(`${argv.json[i]}: INVALID`);
                        console.log(JSON.stringify(result.errors));
                    }
                }
            });

            if (!allValid) {
                process.exitCode = 1;
            }
        })
        .catch(err => {
            log.error(err)
            process.exit(2);
        })
    }
};

//returns a list of promises to objects - each will have valid boolean and errors list
function validate(jobs, primarySchemaName) {
    return Promise.props({
        validator: getValidator(primarySchemaName),
        calcVersions: getCalcVersions()
    }).then(props =>
        jobs.map(jobP => {
            const result = {valid:true, errors:[]};
            const validate = props.validator.getSchema(primarySchemaName);
            return jobP.then(job => {
                result.valid = validate(job);
                if (!result.valid) { result.errors = validate.errors; }
                if(primarySchemaName === 'job' && job.engineVersion && props.calcVersions.indexOf(job.engineVersion) === -1) {
                    result.valid = false;
                    result.errors.push(`Invalid engineVersion value: ${job.engineVersion}  (Versions allowed: ${props.calcVersions.join(', ')})`)
                }
                    
                return result;
            });
        })
    );
}

//initialize the validator and crawl the schema the first time this is called.
function getValidator(primarySchemaName) {
    return addAllSchemas(
        ajv({
            allErrors: true, 
            jsonPointers: true, 
            verbose: config.verbose > 1
        }),
        primarySchemaName
    );
}

//initialize the calcVersions list the first time this is called.
function getCalcVersions() {
    return fs.realpathAsync(path.join(__dirname, '..', config.calcVersionsFile)).then(calcVersionsFile => {
        log.info("config.calcVersionsFile = " + calcVersionsFile);
        return fs.readFileAsync(calcVersionsFile, "utf8").then(calcVersionsStr =>
            calcVersionsStr.split('\n').map(s=>s.trim()).filter(s=>s.length>0)
        );
    });
}

//used for testing
function resetValidator() {
    validator = undefined;
}

//this will add all "$ref" relative schemas to the validator - assumes same dir structure as schema repo
function addAllSchemas(validator, primarySchemaName){
    return fs.realpathAsync(path.join(__dirname, '..', config.primarySchemaPath,primarySchemaName + '.schema')).then(primarySchemaPath => {
        log.info("config.primarySchemaPath = " + primarySchemaPath);

        return crawl(validator, [], primarySchemaPath, primarySchemaName).then(() => validator);
    });
}

function crawl(validator, refsFound, schemaPath, ref){
    if(refsFound.indexOf(ref) === -1){
        refsFound.push(ref);
        log.trace(`adding: schemaPath=${schemaPath}, ref=${ref}`)

        return fs.readFileAsync(schemaPath, "utf8")
            .then(str => {
                const json = JSON.parse(str);
                validator.addSchema(json, ref);

                const schemaStrings = str.split('"$ref"')
                    .filter(s => s.indexOf(".schema")>-1)
                    .map(s => s.substring(s.indexOf('$ref'), s.indexOf(".schema")).replace(':','').replace('"','').trim());
                schemaStrings.shift(); //don't want first one
                log.trace(`schemaStrings:\n${schemaStrings.join('\n')}`)
        
                const schemaObjects = schemaStrings.map(schema => {
                    const sch = {};
                    sch.fullPath = path.join(path.dirname(schemaPath), schema + ".schema");
                    sch.ref = schema + ".schema";
                    return sch;
                });
                log.trace(`found ${schemaObjects.length} references in ${schemaPath}`)

            return Promise.all(
                schemaObjects.map(schema =>
                    crawl(validator, refsFound, schema.fullPath, schema.ref)
                )
            );
        });
    }
}

