# node-red-contrib-iberdrola

A <a href="http://nodered.org" target="_new">Node-RED</a> node which reads the consumption and generation data of your contracts in Iberdrola I-DE.


## Install

Run the following command in the root directory of your Node-RED install

    npm install node-red-contrib-iberdrola or directly from Node-red palette

## Usage

* Gets the information of the import consumption and export generation data of your contrac on the data specified on `msg.payload`
* You may override the user set in the configuration by passing in a value in `msg.user`.
* You can also override the password set in the configuration by passing in a value in `msg.password`.

## Todo
Ability to get contracts and other items separatedly.