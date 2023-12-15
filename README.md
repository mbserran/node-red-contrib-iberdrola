# node-red-contrib-iberdrola

A <a href="http://nodered.org" target="_new">Node-RED</a> node which reads the consumption and generation data of your contracts in Iberdrola I-DE.


## Install

Run the following command in the root directory of your Node-RED install

    npm install node-red-contrib-iberdrola or directly from Node-red palette

## Usage

* Gets the information of the import consumption and export generation data of your contrac on the data specified on `msg.payload`
* You may override the user set in the configuration by passing in a value in `msg.user`.
* You can also override the password set in the configuration by passing in a value in `msg.password`.
* There are two available commands you can indicate in `msg.action`:
	- 'contratos' - It will return a list of available contracts for the user
	- 'readings' - It will provide the readings (consumption and generation) of the corresponding contract selected by the user.
	(In case you do not define the property `msg.action` the 'readings' one will be selected by default.
* You can also select the contract by setting the `msg.contract' to a valid contract code.
  (In case you do not define the property `msg.contract` then teh first contract of the list of available ones for the user will be selected)
  
## Ouput

* There are two different kinds of outputs (may vary in case of error conditions). The output is always returned as key properties of `msg.payload` object:
	- `Action = 'contratos'`
		+contracts: Array with the list of contracts available for the user
		+result: Object containing the result information / error codes
	- `Action = 'readings'`
		+contract:  Contract code corresponding to the readings
		+Dia:       Date selected for readings
		+Import:    Array with the 24 hours consumption readings
		+Export:    Array with the 24 hours generation readings
		+Count:     Number of type of readings left to be provided (-2 - both left, -1 - one left, 0 - all provided)
		+result:    Object containing the result information / error codes
* Error codes are reported in the result object. It has the following key properties:
       - code:  result code
                + 0 - Success
                + 1 - Consumption data not read
                + 2 - Generation data not read
                + 3 - Date not available
                + 4 - Unable to get date limits for current contract
                + 5 - Unable to select the contract
                + 6 - Unable to get list of contracts
                + 7 - Credentials not valid
                + 8 - No contract available
                + 9 - Unexpected error
                + 10 - Date with no valid format
                * 11 - Contract not found in the list of available ones
        - desc: description of the result code
        - msg:  (only when code <> 0)  Information of `msg.payload` when error occurred
* In case of `error code 3` then the following object will be under `msg.payload.result.msg`:
        - limits: object indicating the max and min available dates of the selected contract. No readings available out of that range.

## Todo
None
