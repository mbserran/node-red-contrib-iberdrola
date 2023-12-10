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

		this.on("input", function (msg) {
			
			// Import iberdrola API
			const iberdrolaapi = require('./iberdrola_v2.js');
			
			// Process input parameters
			var user = msg.user || node.user;
			var passwd = msg.password || node.password;
			
			// Open the interface with the supplied credentials
			var iberdrola = new iberdrolaapi.login({
				email: user,
				password: passwd,
				token: {}
			});

			// Process the date of data to extract
			var GlobalIDE = {Dia: undefined, Import: undefined, Export: undefined, Count: -2};
			var fecha = new Date(msg.payload);
			msg.payload = undefined;

			iberdrola.ready.then(() => {

				// Get contracts
				iberdrola.getContracts().then((gcresult) => {
					msg.payload = {contracts: gcresult};

					// Select contract
					iberdrola.selectContract(msg.payload.contracts[0].codContrato).then(() => {

						// Execute the following methods
				
						// Get date limits
						iberdrola.getDateLimits().then((glresult) => {
							msg.payload = {limits: glresult};

							if (fecha > msg.payload.limits.max) {
								node.warn('Date not available');
							}
							var dia = fecha;
							var ano = dia.getFullYear();
							var mes = dia.getMonth()+1;
							mess = ("0" + mes).slice(-2);
							var diar = dia.getDate();
							var diaa = ("0" + diar).slice(-2);
							fecha = ano + '-' + mess + '-' + diaa; 
							GlobalIDE.Dia = fecha;

							 // Get Readings of Day
							iberdrola.getReadingsOfDay(fecha).then((grresult) => {
								GlobalIDE.Import = grresult;
								GlobalIDE.Count += 1;
								msg.payload = GlobalIDE;
								if ( !GlobalIDE.Count ) {
			//                      node.warn(msg.payload);
								  node.send(msg);
								}
							}).catch(() => {
								node.warn('Unable to get readings of day');
							});

							// Get Exports of Day
							iberdrola.getExportsOfDay(fecha).then((geresult) => {
								GlobalIDE.Export = geresult;
								GlobalIDE.Count += 1;
								msg.payload = GlobalIDE;
								if ( !GlobalIDE.Count ) {
			//                        node.warn(msg.payload);
									node.send(msg);
								}
							}).catch(() => {
								node.warn('Unable to get exports of day');
							});
						}).catch(() => {
							node.warn('Unable to get date limits');
						});
					}).catch(() => {
						node.warn('Unable to select contract')
					});
				}).catch(() => {
					node.warn('Unable to list contracts');
				});
			}).catch((error) => {
				if (error === 'no-access') node.warn('Unable to login');
				else if (error === 'no-contract') node.warn('Unable to select contract');
				else node.warn('Unexcepted error', error);
				msg.payload = "Error";
			});			
		});
    }
	
    RED.nodes.registerType("iberdrola",Iberdrola);
}
