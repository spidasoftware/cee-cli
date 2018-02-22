# CEE CLI

## Installation
1. Confirm current calc schema in ../schema
1. `cd cee/cli`
1. `npm install -g`

## Setup
`cee-cli setup`

You will be prompted for CEE server URL, Client ID, and Client Secret.

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
   * `-h, --help`           Show help  [boolean]
   * `-f, --config`         Config file  [default: "$HOME/.config/cee.json"]
   * `-p, --poll`           Poll CEE and write analysis results when complete  [boolean]
   * `-b, --callback`       Callback URL with results  [default: "http://localhost:8080"]
   * `-a, --array`          Expect input files to contain an array of jobs or analyses instead of a single job or analysis  [boolean]
   * `-o, --output`         Analysis Result output  [default: "results"]
   * `-j, --job`            Expect json files to be jobs instead of analysis (Passed callback and calcVersion will be ignored)  [boolean]
   * `-v, --engineVersion`  Version of calc to analyze against  [default: "7.0.0.0-SNAPSHOT"]

#### Examples
  `cee-cli analyze -p pole1.json pole2.json`

### Setup
`cee-cli setup`

Setup CEE connection information

#### Options
  * `-h, --help`    Show help  [boolean]
  * `-n, --new`     Force new config file  [boolean]
  * `-f, --config`  Config file location  [default: "$HOME/.config/cee.json"]
  * `-k, --keep`    Don't overwrite an existing file

### Status
`cee-cli status [jobId..]`

Display status for jobs

#### Options
  * `-h, --help`    Show help  [boolean]
  * `-f, --config`  config file  [default: "$HOME/.config/cee.json"]

### Get
`cee-cli get [jobId..]`

Get jobs, unless stdout is specified.  Jobs will be written to files in the directory specified by the output parameter.

#### Options
  * `-h, --help`    Show help  [boolean]
  * `--id`          Force filename to be job id, (otherwise attempt to use external id)
  * `-f, --config`  Config file  [default: "$HOME/.config/cee.json"]
  * `-c, --stdout`  Don't write to files, instead write as JSON Array to standard out  [boolean]
  * `-o, --output`  Directory to write jobs to (ignored if stdout is specified  [default: "results"]

Copyright SPIDASoftware 2016

Usage: cee-cli analyze [json..]

Send analysis or job in each file to CEE, then optionally poll CEE until analysis is complete  and retrieve results.  If polling is enabled analysis results will be written to a directory specified by the output parameter.

Options:
  -h, --help           Show help  [boolean]
  -f, --config         Config file  [default: "/Users/michaelratliff/.config/cee.json"]
  -p, --poll           Poll CEE and write analysis results when complete  [boolean]
  -b, --callback       Callback URL with results
  -a, --array          Expect input files to contain an array of jobs or analyses instead of a single job or analysis  [boolean]
  -o, --output         Analysis Result output  [default: "results"]
  -j, --job            Expect json files to be jobs instead of analysis (Passed callback and calcVersion will be ignored)  [boolean]
  -v, --engineVersion  Version of calc to analyze against  [default: "7.0.1"]
  -d, --clientData     File containing client data (expect json args to be a structure only; requires analysisCase)
  -c, --analysisCase   File containing analysis case (expect json args to be a structure only; requires clientData)

Examples:
  cee-cli analyze -p pole1.json pole2.json

