# Getting Started with cee

## [The cee-cli project](https://github.com/spidasoftware/cee-cli)
* Our command line utility for direct SPIDAcee access


## Installation
* [Build the project](https://github.com/spidasoftware/cee-cli) with npm

    **Or**

* [Download](https://github.com/spidasoftware/cee-cli/releases) the newest native binary for your platform from our releases page

## SPIDAcee Background

SPIDAcee Analysis Jobs work on the level of one job per analysis, and consist of a single structure, its client data,
 and the load or strength case to be run. This differs significantly from the SPIDAcalc project files, which have many
  structures, several load cases per structure, and one master client data file for the entire project.

The SPIDAcee works over a REST API that can be used without our command line tool, but cee-cli automates several important steps of the process. It is recommended that anyone on a supported platform (mac, windows, or linux) use this tool where possible rather than rolling their own requests.

## cee-cli

cee-cli still expects to work on individual JSON structures, but it provides the following functionality:

- Client Item and Analysis Case Lookup

    - Allows the user to specify an analysis job with a structure JSON, a full clientDataJSON (exported from the
     Client Editor), and the name of the design load case or strength case. This is closer to how jobs are specified by most users.

- Job submission

    - cee-cli will perform the requests to SPIDAcee to run the analysis jobs created. Authentication is done using your
     provided API token, which is the same token you used to authenticate SPIDAcalc.

- Job status polling and results retrieval

    - cee-cli will retrieve the results when finished and download them to a specified directory for processing.

## Setup

1. Download the latest cee-cli release for your platform and install it on your path.

2. In a copy of SPIDAcalc with Client Editor permissions, open the Client Editor and select the client file to be used.
 Go to `File > Export as JSON` to export the Structure and Analysis tabs of the client file into a format that can be processed by cee-cli.

3. Using your own process, generate the structure JSON files you wish to analyze. The files should follow the
 [SPIDAexchange schema](https://github.com/spidasoftware/schema/blob/v5.0.0/resources/schema/spidacalc/calc/structure.schema) for a structure.
 See the [included examples in the cee-cli project](https://github.com/spidasoftware/cee-cli/tree/master/examples):

    In a full SPIDAexchange project, there can be many of these structures, each held under a "design."
     cee-cli acts on the structure data directly.


## Running

1. On a command line, run: 
    ```
    cee-cli setup
    ```

2. Enter `https://cee.spidastudio.com` for the cee server URL, and your API key (which can be viewed on your
 [user page](https://licensemanager.spidastudio.com)).
 
     **Note:** Depending on your network setup, you may additionally need to configure cee-cli to use your proxy. It
      should use the same settings as SPIDAcalc.

3. Analyze your structures. 

    ```
    cee-cli analyze -p -v 7.0.4 -d demoClientData.json -l 'CSA Medium B' -o completed Pole1.json Pole2.json Pole3.json
    ```
    
    #### Breaking down the example command
    `analyze`: Perform an analysis.
    
    `-p`:  Poll for the results and download when analysis is completed.
    
    `-v 7.0.4`: Specify a version of SPIDAcalc.
    
    `-d demoClientData.json`: Client file json used to look up client items and load cases.
    
    `-l 'CSA Medium B'`: Analyze all structures provided using "CSA Medium B" found in demoClientData.json.
    
    `-o completed`: Save all analysis results to the "completed" directory (will be created if it does not exist).
    
    `Pole1.json Pole2.json Pole3.json`:
    The list of structure files to be analyzed. Relative paths are supported.

Click [here](https://github.com/spidasoftware/cee-cli#examples-1) for more usage examples (including how to specify custom load cases, validate your input for testing, and more).
