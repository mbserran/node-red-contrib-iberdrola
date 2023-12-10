/**
* Create client as access point to BASE_URI of Iberdrola API
**/
var request = require('request-json');
var client = request.createClient('https://www.iberdroladistribucionelectrica.com/consumidores/rest/', { jar: true });

/**
* Define iberdrola object where we will create the different methods - Constructor takes two parameters
**/
var api;
var Iberdrola = function(credentials, callback) {

  api = this;

  this.loggedIn = false;
  this.credentials = {
    email: credentials.email,
    password: credentials.password,
    token: credentials.token
  };

  client.headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Content-Type': 'application/json; charset=UTF-8',
    'dispositivo': 'desktop',
    'Sec-Ch-Ua-Platform': 'Windows',
    'Appversion': 'v2',
    'Language': 'es'
  }

  this.ready = !credentials.contract ? this.login() : new Promise((resolve, reject) => {
    this.login().then(() => {
      this.selectContract(credentials.contract).then(() => {
        resolve()
      }).catch(() => {
        reject('no-contract')
      });
    }).catch(() => {
      reject('no-access')
    });
  });
}

/**
 * Factory - Export a login function with credentials and callback to create api object
 **/
module.exports.login = function(cred_obj, callb) {return new Iberdrola(cred_obj, callb);};

/**
 * Login Method
 **/
Iberdrola.prototype.login = function() {

  return new Promise((resolve, reject) => {
    client.post('loginNew/login',
      [
        api.credentials.email,
        api.credentials.password,
        null,
        'Windows 10',
        'PC',
        'Chrome 119.0.0.0',
        '0',
        '0',
        's',
        null
      ],
      (error, response, body) => {
        if (!error && response.statusCode === 200 && body.success.toString() === 'true') {
          api.loggedIn = true;
          api.credentials.token = response.headers["set-cookie"][0];
          resolve();
        } else reject('no-access');
      }
    );
  });
}

/**
 * Get Contracts Method
 **/
Iberdrola.prototype.getContracts = function() {

  return new Promise((resolve, reject) => {
    client.headers = {
      'Cookie': api.credentials.token
    }
    client.get('cto/listaCtos/',
      (error, response, body) => {
        if (!error && response.statusCode === 200 && body.success.toString() === 'true') {
          resolve(body['contratos']);
        } else {
          console.debug({
            error: error,
            response: response,
            body: body
          });
          reject('no-access');
        }
      }
    );
  });
}

/**
 * Select Contract Method
 **/
Iberdrola.prototype.selectContract = function(contract) {

  return new Promise((resolve, reject) => {
    client.headers = {
      'Cookie': api.credentials.token
    }
    client.get('cto/seleccion/' + contract,
      (error, response, body) => {
        if (!error && response.statusCode === 200 && body.success.toString() === 'true') resolve();
        else {
          console.debug({
            error: error,
            response: response,
            body: body
          });
          reject('no-access');
        }
      }
    );
  });
}

/**
 * Get Reading Method
 **/
Iberdrola.prototype.getReading = function() {

  return new Promise((resolve, reject) => {
    client.headers = {
      'Cookie': api.credentials.token
    }
    client.get('escenarioNew/obtenerMedicionOnline/12',
      (error, response, body) => {
        if (!error && response.statusCode === 200) {
          resolve({
            hour: (new Date()).getHours(),
            consumption: body && body.valMagnitud ? parseFloat(body.valMagnitud) : null
          });
        } else {
          console.debug({
            error: error,
            response: response,
            body: body
          });
          reject();
        }
      }
    );
  });
}

/**
 * Get Date Limits Method
 **/
Iberdrola.prototype.getDateLimits = function() {

  return new Promise((resolve, reject) => {
    client.headers = {
      'Cookie': api.credentials.token
    }
    client.get('consumoNew/obtenerLimiteFechasConsumo',
      (error, response, body) => {
        if (!error && response.statusCode === 200) {
          resolve({
            min: new Date(body.fechaMinima.substring(0, 10).split('-').reverse().join('-')),
            max: new Date(body.fechaMaxima.substring(0, 10).split('-').reverse().join('-'))
          });
        } else {
          console.debug({
            error: error,
            response: response,
            body: body
          });
          reject();
        }
      }
    );
  });
}

/**
 * Get Reading Method
 **/
Iberdrola.prototype.getReadingsOfDay = function(date) {

  return new Promise((resolve, reject) => {
    const day = (new Date(date)).toISOString().substring(0, 10).split('-').reverse().join('-');
    client.headers = {
      'Cookie': api.credentials.token
    }
    client.get('consumoNew/obtenerDatosConsumoDH/' + day + "/" + day + '/horas/USU/',
      (error, response, body) => {
        if (!error && response.statusCode === 200) {
          const data = body[0].valores;
          resolve(data.map((entry, index) => {
            return {
              hour: index,
              consumption: parseFloat(entry)
            }
          }));
        } else {
          console.debug({
            error: error,
            response: response,
            body: body
          });
          reject();
        }
      }
    );
  });
}

/**
 * Get Reading Exports Method
 **/
Iberdrola.prototype.getExportsOfDay = function(date) {

  return new Promise((resolve, reject) => {
    const day = (new Date(date)).toISOString().substring(0, 10).split('-').reverse().join('-');
    client.headers = {
      'Cookie': api.credentials.token
    }
    client.get('consumoNew/obtenerDatosProduccionDH/' + day + "/" + day + '/horas/',
      (error, response, body) => {
        if (!error && response.statusCode === 200) {
          const data = body[0].valores;
          resolve(data.map((entry, index) => {
            return {
              hour: index,
              generation: parseFloat(entry)
            }
          }));
        } else {
          console.debug({
            error: error,
            response: response,
            body: body
          });
          reject();
        }
      }
    );
  });
}
