/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.exports = function(RED) {
    "use strict";

    function Iberdrola(n) {
        RED.nodes.createNode(this,n);
        this.host = n.host;
        var node = this;
		
		// Create client as access point to BASE_URI of Iberdrola API
		var Iberdrolaapi = require('iberdrola-api-v2');

		this.on("input", function (msg) {
			
			// Object used for output
			var GlobalIDE = {Dia: undefined, Import: undefined, Export: undefined, Count: -2};

			// Process input parameters
			var user = msg.user || node.user;
			var passwd = msg.password || node.password;
			var fecha = new Date(msg.payload);
			var action = (msg.hasOwnProperty('action')?msg.action:'readings'); // By default put readings to get both consumption and generation - Other command: 'contratos'
			var contract = (msg.hasOwnProperty('contract')?msg.contract:0); // By default get the first contract

			// Check if date is valid
			if (isNaN(fecha)) {
				fecha = JSON.stringify(msg.payload);
				msg.payload = {};
				msg.payload.result = {code: 10, desc: 'date not valid', msg: JSON.parse(fecha)};
				node.send(msg);
				return;
			}

			// Delete properties to avoid to show them in the output
			msg.payload = {};
			delete msg.user;
			delete msg.password;

			// Open the interface with the supplied credentials
			var iberdrola = new Iberdrolaapi.login({
				email: user,
				password: passwd,
				token: {}
			});

			iberdrola.ready.then(() => {

				// Get contracts
				iberdrola.getContracts().then((gcresult) => {
					msg.payload = {contracts: gcresult};
					msg.payload.result = {code: 0, desc: 'success'};

					// Check if command is to get list of contracts and then return
					if (action == 'contratos') {
						node.send(msg);
						return;
					} else {
						msg.payload = {}
					}
					
					// Check if command is to select an specific contract
					if (contract == 0) {
						msg.payload.contract = gcresult[0].codContrato;
					} else {
						let codcontract = contract.toString();
						contract = -1;
						for (let i = 0; i < gcresult.length; i++) {
							if (gcresult[i].codContrato == codcontract) { contract = i; break}
						}
						
						// Check if contract is not found
						if (contract == -1) {
							msg.payload.result = {code: 11, desc: 'Contract not found', msg: {contracts: gcresult}};
							msg.payload.contract = codcontract;
							node.send(msg);
							return;
						} else {
							msg.payload.contract = gcresult[contract].codContrato;
						}
					}

					// Select contract
					iberdrola.selectContract(msg.payload.contract).then(() => {
						
						// Get date limits
						iberdrola.getDateLimits().then((glresult) => {
							msg.payload = Object.assign(msg.payload,{limits: glresult});
							msg.payload.result = {code: 0, desc: 'success'};

							// Check the availability of the date
							if ((fecha > msg.payload.limits.max) || (fecha < msg.payload.limits.min)) {
								if (msg.payload.hasOwnProperty('result')) delete msg.payload.result;
								msg.payload.result = {code: 3, desc: 'date not available', msg: JSON.parse(JSON.stringify(msg.payload))};
								if (msg.payload.hasOwnProperty('limits')) delete msg.payload.limits;
								throw msg.payload.result.code;
							}
							
							// Delete limits
							delete msg.payload.limits;
							
							// Prepare date in the right format
							var dia = fecha;
							var ano = dia.getFullYear();
							var mes = dia.getMonth()+1;
							var mess = ("0" + mes).slice(-2);
							var diar = dia.getDate();
							var diaa = ("0" + diar).slice(-2);
							fecha = ano + '-' + mess + '-' + diaa; 
							GlobalIDE.Dia = fecha;

							 // Get Readings of Day
							iberdrola.getReadingsOfDay(fecha).then((grresult) => {
								GlobalIDE.Import = grresult;
								GlobalIDE.Count += 1;
								msg.payload = Object.assign(msg.payload,GlobalIDE);
								if ( !GlobalIDE.Count ) {
								  msg.payload.result = {code: 0, desc: 'success'};
								  node.send(msg);
								}
							}).catch((error) => {
								msg.payload.result = {code: 1, desc: 'consumption data not read', msg: JSON.parse(JSON.stringify(msg.payload))};
								node.send(msg);
								return;
							});

							// Get Exports of Day
							iberdrola.getExportsOfDay(fecha).then((geresult) => {
								GlobalIDE.Export = geresult;
								GlobalIDE.Count += 1;
								msg.payload = Object.assign(msg.payload,GlobalIDE);
								if ( !GlobalIDE.Count ) {
									msg.payload.result = {code: 0, desc: 'success'};
									node.send(msg);
								}
							}).catch((error) => {
								msg.payload.result = {code: 2, desc: 'generation data not read', msg: JSON.parse(JSON.stringify(msg.payload))};
								node.send(msg);
								return;
							});
						}).catch((error) => {
							if (isNaN(error)) msg.payload.result = {code: 4, desc: error, msg: JSON.parse(JSON.stringify(msg.payload))}
							node.send(msg);
						});
					}).catch((error) => {
						msg.payload.result = {code: 5, desc: error, msg: JSON.parse(JSON.stringify(msg.payload))};
						node.send(msg);
					});
				}).catch((error) => {
					msg.payload.result = {code: 6, desc: error, msg: JSON.parse(JSON.stringify(msg.payload))};
					node.send(msg);
				});
			}).catch((error) => {
				if (error === 'no-access') msg.payload.result = {code: 7, desc: error, msg: JSON.parse(JSON.stringify(msg.payload))};
				else if (error === 'no-contract') msg.payload.result = {code: 8, desc: error, msg: JSON.parse(JSON.stringify(msg.payload))};
				else msg.payload.result = {code: 9, desc: 'Unexpected error', msg: JSON.parse(JSON.stringify(msg.payload))};
				node.send(msg);
			});	
		});
    }
		
    RED.nodes.registerType("iberdrola",Iberdrola);
}
