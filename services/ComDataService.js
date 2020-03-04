var async = require('async'),
soap = require('soap'),
comDataConfig = sails.config.comDataService;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

module.exports = {
	getSecurityHeaders: function() {
		return {
			'wsse:Security':{
				'wsse:UsernameToken': {
					'wsse:Username': comDataConfig.securityUsername,
					'wsse:Password': comDataConfig.securityPassword
				}
			}
		};
	},
	populateAccountData: function(requestObject) {
		if(requestObject) {
			requestObject.accountCode = comDataConfig.accountId;
			requestObject.customerId = comDataConfig.customerId;
			requestObject.password = comDataConfig.password;
			requestObject.signOnName = comDataConfig.signOnName;
			requestObject.securityInfo = comDataConfig.securityInfo;
		}
		return requestObject;
	},
	/**
	 * @example: POST data /comdata/expressCheckRetrieval
	 * {
	 *	"plusLessFlag": 1,
	 *	"amount": "5.00",
	 *	"trackingNumber": 123
	 *	}
	 */
	expressCheckRetrieval: function(requestObject, cb) {
		var wsdlOption = {
			envelopeKey: 'soapenv',
			overridePromiseSuffix: 'lirctek',
			overrideRootElement: {
				xmlnsAttributes: [{
					name: 'xmlns:cow',
					value: "http://cows0103.comdata.com"
				}, {
					name: 'xmlns:wsse',
					value: 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd'
				}]
			}
		};
		var self = this;
		soap.createClient(comDataConfig.soapUrls.realtime, wsdlOption, function(err, client) {
			if(err) {
				return cb(err);
			}
			if(client.expressCheckRetrieval && typeof client.expressCheckRetrieval === 'function') {
				requestObject = self.populateAccountData(requestObject);
				var args = {
					retrievalRequest: requestObject
				};
				client.addSoapHeader(self.getSecurityHeaders(), 'Security', 'wsse', 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd');
				client.expressCheckRetrieval(args, function(err, results) {
					cb(err, results);
				});
			} else {
				cb(new Error('client method GetLoadSearchResults not found'));
			}
		});
	}
};