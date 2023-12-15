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
			if (isNaN(fecha)) {
				msg.payload = "Error";
				throw new Error('\`msg.payload\` is not a valid date', {cause:'Invalid_date'});
			}
			
			// Delete properties to avoid to show them in the output
			msg.payload = undefined;
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
					msg.topic = msg.payload.contracts[0].codContrato;

					// Select contract
					iberdrola.selectContract(msg.payload.contracts[0].codContrato).then(() => {
						
						// Get date limits
						iberdrola.getDateLimits().then((glresult) => {
							msg.payload = {limits: glresult};

							if (fecha > msg.payload.limits.max) {
								throw new Error('Max date: ' + msg.payload.limits.max);
							}
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
								msg.payload = GlobalIDE;
								if ( !GlobalIDE.Count ) {
								  node.send(msg);
								}
							}).catch((err) => {
								node.warn('Unable to get readings of day: ' + err.message);
							});

							// Get Exports of Day
							iberdrola.getExportsOfDay(fecha).then((geresult) => {
								GlobalIDE.Export = geresult;
								GlobalIDE.Count += 1;
								msg.payload = GlobalIDE;
								if ( !GlobalIDE.Count ) {
									node.send(msg);
								}
							}).catch((err) => {
								node.warn('Unable to get exports of day: ' + err.message);
							});
						}).catch((err) => {
							msg.payload = "Error";
							err.message = 'Unable to get date limits - ' + err.message;
							msg.error = new Error(err);
							node.error(msg);
						});
					}).catch((err) => {
						msg.payload = "Error";
						err.message = 'Unable to select contract: ' + err.message;
						msg.error = new Error(err.message);
						node.error(msg);
					});
				}).catch((err) => {
					msg.payload = "Error";
					err.message = 'Unable to list contracts: ' + err.message;
					msg.error = new Error(err.message);
					node.error(msg);
				});
			}).catch((err) => {
				msg.payload = err;
				node.send(msg);
				if (err === 'no-access') err = 'Unable to login: ' + err;
				else if (err === 'no-contract') err = 'Unable to select contract: ' + err;
				else err = 'Unexcepted error: ' + err;
				msg.error = new Error(err);
				node.error(msg);
			});
			
			iberdrola.ready.finally((err) => {
				msg.payload = err;
				node.send(msg);
				throw new Error(err.message);
			});
		});
    }
		
    RED.nodes.registerType("iberdrola",Iberdrola);
}
