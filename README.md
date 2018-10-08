# CEE CLI

## [Getting Started](https://github.com/spidasoftware/cee-cli/tree/master/GETTING_STARTED.md)

## Installation
1. Confirm current calc schema in ../schema
1. Confirm list of valid Calc versions in ../cee/master/calc-versions.txt
1. `npm install`

## Packaging
1. `npm install -g pkg`
1. ./package.sh
1. Executables will be created in ./target

## Setup
`cee-cli setup`

You will be prompted for CEE server URL and API Key

## Usage
`cee-cli <command> [opts..]`

Run cee-cli -h <command> for help with a specific command.

## Options
  * `-h, --help`  Show help  [boolean]

## Commands

### Validate
`cee-cli validate [json..]`

Validate jobs or analysis.  Validates each file against JSON schema.  If job option is specified, validation will be done against the job schema.  Otherwise validation will be done against the analysis schema.  Return code is 0 if all files validated successfully and 1 otherwise.

#### Options
  * `-h, --help`     Show help  [boolean]
  * `-v, --verbose`  Increase verbosity (can be used more than once)  [count]
  * `-q, --quiet`    Don't output anything  [boolean]
  * `-j, --job`      Validate job instead of analysis  [boolean]


### Analyze
`cee-cli analyze [json..]`

Send analysis or job in each file to CEE, then optionally poll CEE until analysis is complete  and retrieve results.  If polling is enabled analysis results will be written to a directory specified by the output parameter.

#### Options
   * `-h, --help`             Show help  [boolean]
   * `-f, --config`           Config file  [default: "$HOME/.config/cee.json" (unix), "%APPDATA%/cee.json" (windows)]
   * `-p, --poll`             Poll CEE and write analysis results when complete  [boolean]
   * `-b, --callback`         Callback URL with results  [default: "http://localhost:8080"]
   * `-a, --array`            Expect input files to contain an array of jobs or analyses instead of a single job or analysis  [boolean]
   * `-o, --output`           Analysis Result output  [default: "results"]
   * `-j, --job`              Expect json files to be jobs instead of analysis (Passed callback and calcVersion will be ignored)  [boolean]
   * `-v, --engineVersion`    Version of calc to analyze against  [default: "7.0.1"]
   * `-d, --clientData`       File containing client data (expect json args to be a structure only; requires one of analysisCase, loadCaseName, or strengthCaseName)
   * `-c, --analysisCase`     File containing analysis case (requires clientData; conflicts with loadCaseName and strengthCaseName)
   * `-l, --loadCaseName`     Used named load case from clientData. (requires clientData; conflicts with analysisCase and strengthCaseName)
   * `-s, --strengthCaseName` Used named load case from clientData. (requires clientData; conflicts with analysisCase and loadCaseName)

#### Examples
  `cee-cli analyze -p pole1.json pole2.json`

### Setup
`cee-cli setup`

Setup CEE connection information

#### Options
  * `-h, --help`    Show help  [boolean]
  * `-n, --new`     Force new config file  [boolean]
  * `-f, --config`  Config file  [default: "$HOME/.config/cee.json" (unix), "%APPDATA%/cee.json" (windows)]
  * `-k, --keep`    Don't overwrite an existing file

### Status
`cee-cli status [jobId..]`

Display status for jobs

#### Options
  * `-h, --help`    Show help  [boolean]
  * `-f, --config`  Config file  [default: "$HOME/.config/cee.json" (unix), "%APPDATA%/cee.json" (windows)]

### Get
`cee-cli get [jobId.. | --offset n]`

Get jobs, unless stdout is specified.  Jobs will be written to files in the directory specified by the output parameter.  Jobs can be specified by id or using --offset and --limit to get the last x (--limit) jobs starting at job y (--offset).

#### Options
  * `-h, --help`    Show help  [boolean]
  * `--id`          Force filename to be job id, (otherwise attempt to use external id)
  * `-f, --config`  Config file  [default: "$HOME/.config/cee.json" (unix), "%APPDATA%/cee.json" (windows)]
  * `-c, --stdout`  Don't write to files, instead write as JSON Array to standard out [boolean]
  * `-o, --output`  Directory to write jobs to (ignored if stdout is specified [default: "results"]
  * `-s, --strip`   Prepare job for sending to CEE again strip out everything but analysis [boolean]
  * `--limit`       Get this many jobs (don't use with jobIds)         [default: 50]
  * `--offset`      Get jobs starting at this offset

## Examples

  The examples directory in the repo contains example client data, analysis cases, and structures.  Setup CEE config using `cee-cli setup`. 

  Send analysis to CEE and long-poll for results, writing analysis results to "completed" directory when done. Analyze against Calc version 7.0.0.
 ```
 cee-cli analyze -p -v 7.0.0 -d examples/demoClientData.json -c examples/go95Light.json -o completed examples/structures/Revised/Busy_Pole.json examples/structures/Revised/Basic_Tangent_Assembly.json examples/structures/Revised/Basic_Tangent_Assembly_w_Comms.json
 ```

  Same as above but use load case CSA Medium B included in demoClientData.json
 ```
 cee-cli analyze -p -v 7.0.0 -d examples/demoClientData.json -l 'CSA Medium B' -o completed examples/structures/Revised/Busy_Pole.json examples/structures/Revised/Basic_Tangent_Assembly.json examples/structures/Revised/Basic_Tangent_Assembly_w_Comms.json
 ```

  Same as above but use strength case CSA included in demoClientData.json.  Note: Do not send send jobs to CEE with a strength case but no damages.
 ```
 cee-cli analyze -p -v 7.0.0 -d examples/demoClientData.json -s CSA -o completed examples/structures/Revised/Busy_Pole.json 
 ```

  Send analysis to CEE, don't wait for analysis to complete (jobIds will be given on stdout as json)
 ```
 cee-cli analyze -d examples/oneOfEverythingClientData.json -l NESC examples/structures/oneOfEverything1.json examples/structures/oneOfEverything2.json
 ```

  Get my last 20 jobs save to "archive" directory
  ```
  cee-cli get --limit 20 --offset 0 -o archive
  ```
  
  ## Generate License Report
  Install the project
  ```
  cd cee-cli
  npm install
  ```
  Install the license-checker tool:
  ```
  npm install -g license-checker
  ```
  Generate the license report:
  ```
  license-checker --csv --out cee-cli_js_license_report.csv
  cat cee-cli_js_license_report.csv
  ```
