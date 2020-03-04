(function() {
	'use strict';
	var Mandrill = require('machinepack-mandrill'), moment = require('moment'), self = this, fs = require('fs'), async = require('async');

	/**
     *  Send email's to the given user with the given template name and template variables
     *  This is a private method to force to create a wrapper for sending templates that is handled by this module
     * @example:
     *      sails.services['emailservice'].sendWelcomeEmail('tmjam.ahmed@gmail.com', 'Tauseef');
     * @param  {String} to           Destination Email address
     * @param  {String} templateName Template Name (stored on the provider)
     * @param  {Array}  variables    Array of template variables and its contents
     * @return
     */
	var sendEmail = function(to, templateName, variables, attachments, subject, cb) {
		Mandrill.sendTemplateEmail({
			apiKey: sails.config.mandrill.apikey,
			toEmail: to,
			templateName: templateName,
			mergeVars: variables,
			attachments: attachments,
			subject: subject
		}).exec({
			// An unexpected error occurred.
			error: function(err) {
                cb(err);
			},
			// OK.
			success: function() { cb(null, 'Sent SuccessFully!');}
		});
	};

	/**
     *  Send email's to the given user with the given template name and template variables
     *  This is a private method to force to create a wrapper for sending templates that is handled by this module.
     *  This method lets you override the from email address that is sent in the email.
     * @example:
     *      sails.services['emailservice'].sendWelcomeEmail('tmjam.ahmed@gmail.com', 'test@something.com', 'Tauseef');
     * @param  {String} to           Destination Email address
     * @param  {String} from         Sender Email address
     * @param  {String} templateName Template Name (stored on the provider)
     * @param  {Array}  variables    Array of template variables and its contents
     * @return
     */
	var sendEmailFrom = function(to, from, templateName, variables, attachments, subject, cb) {
		Mandrill.sendTemplateEmail({
			apiKey: sails.config.mandrill.apikey,
			toEmail: to,
			fromEmail: from,
			templateName: templateName,
			mergeVars: variables,
			attachments: attachments,
			subject: subject
		}).exec({
			// An unexpected error occurred.
			error: function(err) {
                cb(err);
			},
			// OK.
			success: function() { cb(null, 'Sent SuccessFully!'); }
		});
	};

	module.exports.sendWelcomeEmail = function(to, toName) {
		var templateVariables = [
			{
				name: 'USERNAME',
				content: toName
			}
		];
		sendEmail(to, 'welcome', templateVariables, [], '');
	};

	module.exports.sendDispatchEmail = function(dispatch, addresses, driver) {
		for (var a = 0; a < addresses.length; a++) {
			if (addresses[a].Id == dispatch.Shipper.Address) var shipperAddress = addresses[a];
			if (addresses[a].Id == dispatch.Consignee.Address) var consigneeAddress = addresses[a];
		}

		var templateVariables = [
			{
				name: 'COMPANYNAME',
				content: dispatch.Company.Name
			},
			{
				name: 'DRIVERNAME',
				content: driver.FirstName + ' ' + driver.LastName
			},
			{
				name: 'LOADNUMBER',
				content: dispatch.LoadNumber
			},
			{
				name: 'PICKUPDATETIME',
				content: moment(dispatch.PickupAppointment).tz('America/Los_Angeles').format('MMMM Do YYYY, h:mm a')
			},
			{
				name: 'PICKUPNUMBER',
				content: dispatch.PickupNumber
			},
			{
				name: 'SHIPPERNAME',
				content: dispatch.Shipper.Name
			},
			{
				name: 'SHIPPERADDRESS',
				content: shipperAddress.Address1
			},
			{
				name: 'SHIPPERCITY',
				content: shipperAddress.City
			},
			{
				name: 'SHIPPERSTATE',
				content: shipperAddress.State
			},
			{
				name: 'SHIPPERZIP',
				content: shipperAddress.Zip
			},
			{
				name: 'DELIVERYDATETIME',
				content: moment(dispatch.PickupDeliveryAppointment)
					.tz('America/Los_Angeles')
					.format('MMMM Do YYYY, h:mm a')
			},
			{
				name: 'CONFIRMATIONNUMBER',
				content: dispatch.ConfirmationNumber
			},
			{
				name: 'CONSIGNEENAME',
				content: dispatch.Consignee.Name
			},
			{
				name: 'CONSIGNEEADDRESS',
				content: consigneeAddress.Address1
			},
			{
				name: 'CONSIGNEECITY',
				content: consigneeAddress.City
			},
			{
				name: 'CONSIGNEESTATE',
				content: consigneeAddress.State
			},
			{
				name: 'CONSIGNEEZIP',
				content: consigneeAddress.Zip
			},
			{
				name: 'PIECECOUNT',
				content: dispatch.PieceCount
			},
			{
				name: 'PALLETS',
				content: dispatch.Pallets
			}
		];

		sendEmail(driver.Email, 'dispatch', templateVariables, [], '');
	};

	module.exports.sendDispatchSplitLoadEmail = function(dispatch, splitLoad, driver, addresses) {
		for (var a = 0; a < addresses.length; a++) {
			if (addresses[a].Id == splitLoad.Shipper.Address) var shipperAddress = addresses[a];
			if (addresses[a].Id == splitLoad.Consignee.Address) var consigneeAddress = addresses[a];
		}
		var templateVariables = [
			{
				name: 'COMPANYNAME',
				content: dispatch.Company.Name
			},
			{
				name: 'DRIVERNAME',
				content: driver.FirstName + ' ' + driver.LastName
			},
			{
				name: 'LOADNUMBER',
				content: dispatch.LoadNumber
			},
			{
				name: 'PICKUPDATETIME',
				content: moment(splitLoad.PickupDate).tz('America/Los_Angeles').format('MMMM Do YYYY, h:mm a')
			},
			{
				name: 'PICKUPNUMBER',
				content: ''
			},
			{
				name: 'SHIPPERNAME',
				content: splitLoad.Shipper.Name
			},
			{
				name: 'SHIPPERADDRESS',
				content: shipperAddress.Address1
			},
			{
				name: 'SHIPPERCITY',
				content: shipperAddress.City
			},
			{
				name: 'SHIPPERSTATE',
				content: shipperAddress.State
			},
			{
				name: 'SHIPPERZIP',
				content: shipperAddress.Zip
			},
			{
				name: 'DELIVERYDATETIME',
				content: moment(splitLoad.DeliveryDate).tz('America/Los_Angeles').format('MMMM Do YYYY, h:mm a')
			},
			{
				name: 'CONFIRMATIONNUMBER',
				content: ''
			},
			{
				name: 'CONSIGNEENAME',
				content: splitLoad.Consignee.Name
			},
			{
				name: 'CONSIGNEEADDRESS',
				content: consigneeAddress.Address1
			},
			{
				name: 'CONSIGNEECITY',
				content: consigneeAddress.City
			},
			{
				name: 'CONSIGNEESTATE',
				content: consigneeAddress.State
			},
			{
				name: 'CONSIGNEEZIP',
				content: consigneeAddress.Zip
			},
			{
				name: 'PIECECOUNT',
				content: dispatch.PieceCount
			},
			{
				name: 'PALLETS',
				content: dispatch.Pallets
			}
		];

		sendEmail(driver.Email, 'dispatch', templateVariables, [], '');
	};

	module.exports.sendDispatchStatusEmail = function(dispatch, addresses, broker) {
		for (var a = 0; a < addresses.length; a++) {
			if (addresses[a].Id == dispatch.Shipper.Address) var shipperAddress = addresses[a];
			if (addresses[a].Id == dispatch.Consignee.Address) var consigneeAddress = addresses[a];
		}

		var templateVariables = [
			{
				name: 'COMPANYNAME',
				content: dispatch.Company.Name
			},
			{
				name: 'BROKERNAME',
				content: broker.ContactPerson
			},
			{
				name: 'LOADNUMBER',
				content: dispatch.LoadNumber
			},
			{
				name: 'LOADSTATUS',
				content: dispatch.DispatchStatus.Name
			},
			{
				name: 'PICKUPDATETIME',
				content: moment(dispatch.PickupAppointment).tz('America/Los_Angeles').format('MMMM Do YYYY, h:mm a')
			},
			{
				name: 'PICKUPNUMBER',
				content: dispatch.PickupNumber
			},
			{
				name: 'SHIPPERNAME',
				content: dispatch.Shipper.Name
			},
			{
				name: 'SHIPPERADDRESS',
				content: shipperAddress.Address1
			},
			{
				name: 'SHIPPERCITY',
				content: shipperAddress.City
			},
			{
				name: 'SHIPPERSTATE',
				content: shipperAddress.State
			},
			{
				name: 'SHIPPERZIP',
				content: shipperAddress.Zip
			},
			{
				name: 'DELIVERYDATETIME',
				content: moment(dispatch.PickupDeliveryAppointment)
					.tz('America/Los_Angeles')
					.format('MMMM Do YYYY, h:mm a')
			},
			{
				name: 'CONFIRMATIONNUMBER',
				content: dispatch.ConfirmationNumber
			},
			{
				name: 'CONSIGNEENAME',
				content: dispatch.Consignee.Name
			},
			{
				name: 'CONSIGNEEADDRESS',
				content: consigneeAddress.Address1
			},
			{
				name: 'CONSIGNEECITY',
				content: consigneeAddress.City
			},
			{
				name: 'CONSIGNEESTATE',
				content: consigneeAddress.State
			},
			{
				name: 'CONSIGNEEZIP',
				content: consigneeAddress.Zip
			},
			{
				name: 'PIECECOUNT',
				content: dispatch.PieceCount
			},
			{
				name: 'PALLETS',
				content: dispatch.Pallets
			}
		];

		sendEmail(broker.Email, 'broker', templateVariables, [], '');
	};

	module.exports.sendBrokerDispatchEmail = function(dispatch, addresses, carrierComp) {
		for (var a = 0; a < addresses.length; a++) {
			if (addresses[a].Id == dispatch.Shipper.Address) var shipperAddress = addresses[a];
			if (addresses[a].Id == dispatch.Consignee.Address) var consigneeAddress = addresses[a];
		}

		var templateVariables = [
			{
				name: 'COMPANYNAME',
				content: dispatch.Company.BrokerageCompanyName
			},
			{
				name: 'COMPANYPHONE',
				content: dispatch.Company.BrokerageCompanyPhone
			},
			{
				name: 'COMPANYFAX',
				content: dispatch.Company.BrokerageCompanyFax
			},
			{
				name: 'CARRIERNAME',
				content: carrierComp.Name
			},
			{
				name: 'LOADNUMBER',
				content: dispatch.LoadNumber
			},
			{
				name: 'AMOUNT',
				content: dispatch.CarrierPayAmount
			},
			{
				name: 'PICKUPDATETIME',
				content: moment(dispatch.PickupAppointment).tz('America/Los_Angeles').format('MMMM Do YYYY, h:mm a')
			},
			{
				name: 'PICKUPNUMBER',
				content: dispatch.PickupNumber
			},
			{
				name: 'SHIPPERNAME',
				content: dispatch.Shipper.Name
			},
			{
				name: 'SHIPPERADDRESS',
				content: shipperAddress.Address1
			},
			{
				name: 'SHIPPERCITY',
				content: shipperAddress.City
			},
			{
				name: 'SHIPPERSTATE',
				content: shipperAddress.State
			},
			{
				name: 'SHIPPERZIP',
				content: shipperAddress.Zip
			},
			{
				name: 'DELIVERYDATETIME',
				content: moment(dispatch.PickupDeliveryAppointment)
					.tz('America/Los_Angeles')
					.format('MMMM Do YYYY, h:mm a')
			},
			{
				name: 'CONFIRMATIONNUMBER',
				content: dispatch.ConfirmationNumber
			},
			{
				name: 'CONSIGNEENAME',
				content: dispatch.Consignee.Name
			},
			{
				name: 'CONSIGNEEADDRESS',
				content: consigneeAddress.Address1
			},
			{
				name: 'CONSIGNEECITY',
				content: consigneeAddress.City
			},
			{
				name: 'CONSIGNEESTATE',
				content: consigneeAddress.State
			},
			{
				name: 'CONSIGNEEZIP',
				content: consigneeAddress.Zip
			},
			{
				name: 'PIECECOUNT',
				content: dispatch.PieceCount
			},
			{
				name: 'PALLETS',
				content: dispatch.Pallets
			}
		];

		sendEmail(carrierComp.Email, 'brokerage', templateVariables, [], '');
	};

	module.exports.SendMessagetoBroker = function(message, cb) {
		var attachments = [], images = [];
		for (var i = 0; i < message.Documents.length; i++) {
			var file = '';
			var bitmap = '';
			if (message.Documents[i].AddAttachment === true) {
				if (message.Documents[i].FileName === 'Invoice') {
					// bitmap = fs.readFileSync(
					// 	'BrokerDocs/' + message.Documents[i].FileName + '-' + message.Dispatch_Id + '.pdf'
					// );
					attachments.push({
						type: 'application/pdf',
						name: 'Invoice.pdf',
						content: message.Documents[i].PDFFile
					});
				} else {
					var ext = '';
					if (message.Documents[i].ExtName === '.pdf' || message.Documents[i].ExtName === '.PDF')
						ext = 'application/pdf';
					else
						//                 if(message.Documents[i].ExtName === '.png' || message.Documents[i].ExtName === '.jpg')
						ext = 'image/png';
					attachments.push({
						type: ext,
						name: message.Documents[i].FileName + message.Documents[i].ExtName,
						content: message.Documents[i].PDFFile
					});
				}
			}
		}
		var templateVariables = [
			{
				name: 'Body',
				content: message.Body ? message.Body : ''
			}
		];
//		sendEmailFrom(message.BrokerEmail,message.ToEmail, 'invoice', templateVariables, attachments, message.Subject);

        if(message.ToEmail) {
            if (message.Emails) {
                var emails = message.Emails.split(';');
                if (emails.length > 0) {
                    async.forEach(Object.keys(emails), function(i, cback) {
                        sendEmailFrom(emails[i], message.ToEmail,'invoice', templateVariables, attachments, message.Subject, function (err, result) {
                            cback(err, result);
                        });
                    }, function (err, result) {
                        cb(err, result);
                    });
                } else {
                    sendEmailFrom(message.Emails, message.ToEmail,'invoice', templateVariables, attachments, message.Subject, function (err, result) {
                        cb(err, result);
                    });
                }
            }
        } else {
//            sendEmailFrom(message.BrokerEmail,message.ToEmail, 'invoice', templateVariables, attachments, message.Subject);

		if (message.Emails) {
			var emails = message.Emails.split(';');
			if (emails.length > 0) {
				async.forEach(Object.keys(emails), function(i, cback) {
					sendEmail(emails[i], 'invoice', templateVariables, attachments, message.Subject, function (err, result) {
                        cback(err, result);
                        });
                }, function (err, result) {
                    cb(err, result);
                });
			} else {
				sendEmail(message.Emails, 'invoice', templateVariables, attachments, message.Subject, function (err, result) {
                        cb(err, result);
                    });
			}
		}
        }
	};
	/**
	 * Service Method to SendNotification to Customer from Broker For Check call info & Status Info
	 */
	module.exports.SendNotificationToCustomer = function (message, cb) {
		var templateVariables = [
			{
				name: 'Body',
				content: message.Body ? message.Body : ''
			}
		];
		if (message.ToEmail) {
			//If To Email Exist..
			if (message.Emails) {
				var emails = message.Emails.split(';');
				if (emails.length > 0) {
					async.forEach(Object.keys(emails), function (i, cback) {
						sendEmailFrom(emails[i], message.ToEmail, 'invoice', templateVariables, [], message.Subject, function (err, result) {
							cback(err, result);
						});
					}, function (err, result) {
						cb(err, result);
					});
				} else {
					sendEmailFrom(message.Emails, message.ToEmail, 'invoice', templateVariables, [], message.Subject, function (err, result) {
						cback(err, result);
					});
				}
			}
		} else {
			//If To Email not Exist..
			if (message.Emails) {
				var emails = message.Emails.split(';');
				if (emails.length > 0) {
					async.forEach(Object.keys(emails), function (i, cback) {
						sendEmail(emails[i], 'invoice', templateVariables, [], message.Subject, function (err, result) {
							cback(err, result);
						});
					}, function (err, result) {
						cb(err, result);
					});
				} else {
					sendEmail(message.Emails, 'invoice', templateVariables, [], message.Subject, function (err, result) {
						cback(err, result);
					});
				}
			}
		}
	};

    module.exports.SendMessagetoCustomer = function(message, cb) {
		var attachments = [], images = [];
		for (var i = 0; i < message.Documents.length; i++) {
			var file = '';
			var bitmap = '';
			if (message.Documents[i].AddAttachment === true) {
				if (message.Documents[i].FileName === 'Invoice') {
					// bitmap = fs.readFileSync(
					// 	'BrokerDocs/' + message.Documents[i].FileName + '-' + message.CO_Id + '.pdf'
					// );
					attachments.push({
						type: 'application/pdf',
						name: 'Invoice.pdf',
						content: message.Documents[i].PDFFile
					});
				} else {
					var ext = '';
					if (message.Documents[i].ExtName === '.pdf' || message.Documents[i].ExtName === '.PDF')
						ext = 'application/pdf';
					else
						ext = 'image/png';
					attachments.push({
						type: ext,
						name: message.Documents[i].FileName,
						content: message.Documents[i].PDFFile
					});
				}
			}
		}
		var templateVariables = [
			{
				name: 'Body',
				content: message.Body ? message.Body : ''
			}
		];

        if(message.ToEmail) {
            if (message.Emails) {
                var emails = message.Emails.split(';');
                if (emails.length > 0) {
                    async.forEach(Object.keys(emails), function(i, cback) {
                        sendEmailFrom(emails[i], message.ToEmail,'invoice', templateVariables, attachments, message.Subject, function (err, result) {
                            cback(err, result);
                        });
                    }, function (err, result) {
                        cb(err, result);
                    });
                } else {
                    sendEmailFrom(message.Emails, message.ToEmail,'invoice', templateVariables, attachments, message.Subject, function (err, result) {
                        cb(err, result);
                    });
                }
            }
        } else {
//            sendEmailFrom(message.BrokerEmail,message.ToEmail, 'invoice', templateVariables, attachments, message.Subject);

		if (message.Emails) {
			var emails = message.Emails.split(';');
			if (emails.length > 0) {
				async.forEach(Object.keys(emails), function(i, cback) {
					sendEmail(emails[i], 'invoice', templateVariables, attachments, message.Subject, function (err, result) {
                        cback(err, result);
                        });
                }, function (err, result) {
                    cb(err, result);
                });
			} else {
				sendEmail(message.Emails, 'invoice', templateVariables, attachments, message.Subject, function (err, result) {
                        cb(err, result);
                    });
			}
		}
        }
	};
    
    module.exports.SendGPSTrackerforTrucksbyCustomer = function(message, cb) {
		var attachments = [], images = [];
        
        attachments.push({
            type: 'text/csv',
            name: message.Document + '.csv',
            content: new Buffer(message.CSV).toString('base64')
        });
		var templateVariables = [
			{
				name: 'Body',
				content: message.Body ? message.Body : ''
			}
		];

        if(message.ToEmail) {
            if (message.Emails) {
                var emails = message.Emails.split(';');
                if (emails.length > 0) {
                    async.forEach(Object.keys(emails), function(i, cback) {
                        sendEmailFrom(emails[i], message.ToEmail,'invoice', templateVariables, attachments, message.Subject, function (err, result) {
                            cback(err, result);
                        });
                    }, function (err, result) {
                        cb(err, result);
                    });
                } else {
                    sendEmailFrom(message.Emails, message.ToEmail,'invoice', templateVariables, attachments, message.Subject, function (err, result) {
                        cb(err, result);
                    });
                }
            }
        } else {
            if (message.Emails) {
                var emails = message.Emails.split(';');
                if (emails.length > 0) {
                    async.forEach(Object.keys(emails), function(i, cback) {
                        sendEmail(emails[i], 'invoice', templateVariables, attachments, message.Subject, function (err, result) {
                            cback(err, result);
                            });
                    }, function (err, result) {
                        cb(err, result);
                    });
                } else {
                    sendEmail(message.Emails, 'invoice', templateVariables, attachments, message.Subject, function (err, result) {
                            cb(err, result);
                        });
                }
            }
        }
	};
    
    module.exports.SendRepairInvoice = function(message, cb) {
        var bitmap ='', attachments = [];
        
        attachments.push({
            type: 'application/pdf',
            name: 'Invoice.pdf',
            content: new Buffer(message.Buffer).toString('base64')
        });
        
		var templateVariables = [
			{
				name: 'Body',
				content: message.Body ? message.Body : ''
			}
		];
        
        if(message.ToEmail) {
            if (message.Emails) {
                var emails = message.Emails.split(';');
                if (emails.length > 0) {
                    async.forEach(Object.keys(emails), function(i, cback) {
                        sendEmailFrom(emails[i], message.ToEmail,'invoice', templateVariables, attachments, message.Subject, function (err, result) {
                            cback(err, result);
                        });
                    }, function (err, result) {
                        cb(err, result);
                    });
                } else {
                    sendEmailFrom(message.Emails, message.ToEmail,'invoice', templateVariables, attachments, message.Subject, function (err, result) {
                        cb(err, result);
                    });
                }
            }
        } else {

		if (message.Emails) {
			var emails = message.Emails.split(';');
			if (emails.length > 0) {
				async.forEach(Object.keys(emails), function(i, cback) {
					sendEmail(emails[i], 'invoice', templateVariables, attachments, message.Subject, function (err, result) {
                        cback(err, result);
                        });
                }, function (err, result) {
                    cb(err, result);
                });
			} else {
				sendEmail(message.Emails, 'invoice', templateVariables, attachments, message.Subject, function (err, result) {
                        cb(err, result);
                    });
			}
		}
        }
	};
    
    module.exports.SendMessagetoCarrier = function(message, cb) {
        var bitmap ='', attachments = [];
        // bitmap = fs.readFileSync(
		// 				'BrokerDocs/RateCon-' + message.DO_Id + '.pdf'
		// 			);
        
        attachments.push({
            type: 'application/pdf',
            name: 'RateConfirmation.pdf',
            content: new Buffer(message.Buffer).toString('base64')
        });
        
		var templateVariables = [
			{
				name: 'Body',
				content: message.Body ? message.Body : ''
			}
		];
        
        if(message.ToEmail) {
            if (message.Emails) {
                var emails = message.Emails.split(';');
                if (emails.length > 0) {
                    async.forEach(Object.keys(emails), function(i, cback) {
                        sendEmailFrom(emails[i], message.ToEmail,'invoice', templateVariables, attachments, message.Subject, function (err, result) {
                            cback(err, result);
                        });
                    }, function (err, result) {
                        cb(err, result);
                    });
                } else {
                    sendEmailFrom(message.Emails, message.ToEmail,'invoice', templateVariables, attachments, message.Subject, function (err, result) {
                        cb(err, result);
                    });
                }
            }
        } else {

		if (message.Emails) {
			var emails = message.Emails.split(';');
			if (emails.length > 0) {
				async.forEach(Object.keys(emails), function(i, cback) {
					sendEmail(emails[i], 'invoice', templateVariables, attachments, message.Subject, function (err, result) {
                        cback(err, result);
                        });
                }, function (err, result) {
                    cb(err, result);
                });
			} else {
				sendEmail(message.Emails, 'invoice', templateVariables, attachments, message.Subject, function (err, result) {
                        cb(err, result);
                    });
			}
		}
        }
	};
    
    module.exports.SendMessagetoCarrierInCO = function(message, cb) {
        var bitmap ='', attachments = [];
        // bitmap = fs.readFileSync(
		// 				'BrokerDocs/CORateCon-' + message.CO_Id + '.pdf'
		// 			);
        attachments.push({
            type: 'application/pdf',
            name: 'RateConfirmation.pdf',
            content: new Buffer(message.Buffer).toString('base64')
        });
        
		var templateVariables = [
			{
				name: 'Body',
				content: message.Body ? message.Body : ''
			}
		];
        
        if(message.ToEmail) {
            if (message.Emails) {
                var emails = message.Emails.split(';');
                if (emails.length > 0) {
                    async.forEach(Object.keys(emails), function(i, cback) {
                        sendEmailFrom(emails[i], message.ToEmail,'invoice', templateVariables, attachments, message.Subject, function (err, result) {
                            cback(err, result);
                        });
                    }, function (err, result) {
                        cb(err, result);
                    });
                } else {
                    sendEmailFrom(message.Emails, message.ToEmail,'invoice', templateVariables, attachments, message.Subject, function (err, result) {
                        cb(err, result);
                    });
                }
            }
        } else {

		if (message.Emails) {
			var emails = message.Emails.split(';');
			if (emails.length > 0) {
				async.forEach(Object.keys(emails), function(i, cback) {
					sendEmail(emails[i], 'invoice', templateVariables, attachments, message.Subject, function (err, result) {
                        cback(err, result);
                        });
                }, function (err, result) {
                    cb(err, result);
                });
			} else {
				sendEmail(message.Emails, 'invoice', templateVariables, attachments, message.Subject, function (err, result) {
                        cb(err, result);
                    });
			}
		}
        }
	};
    
    module.exports.SendInvoiceRemainder = function(message, cb) {
        var bitmap ='', attachments = [];
        attachments.push({
            type: 'application/pdf',
            name: 'InvoiceRemainder.pdf',
            content: new Buffer(message.Buffer).toString('base64')
        });
        
		var templateVariables = [
			{
				name: 'Body',
				content: message.Body ? message.Body : ''
			}
		];
        
        if(message.From) {
            if (message.Emails) {
                var emails = message.Emails.split(';');
                if (emails.length > 0) {
                    async.forEach(Object.keys(emails), function(i, cback) {
                        sendEmailFrom(emails[i], message.From,'invoice', templateVariables, attachments, message.Subject, function (err, result) {
                            cback(err, result);
                        });
                    }, function (err, result) {
                        cb(err, result);
                    });
                } else {
                    sendEmailFrom(message.Emails, message.From,'invoice', templateVariables, attachments, message.Subject, function (err, result) {
                        cb(err, result);
                    });
                }
            }
        } else {

		if (message.Emails) {
			var emails = message.Emails.split(';');
			if (emails.length > 0) {
				async.forEach(Object.keys(emails), function(i, cback) {
					sendEmail(emails[i], 'invoice', templateVariables, attachments, message.Subject, function (err, result) {
                        cback(err, result);
                        });
                }, function (err, result) {
                    cb(err, result);
                });
			} else {
				sendEmail(message.Emails, 'invoice', templateVariables, attachments, message.Subject, function (err, result) {
                        cb(err, result);
                    });
			}
		}
        }
	};
    
    module.exports.SendElogPrint = function(message, cb) {
        var bitmap ='', attachments = [];
        bitmap = fs.readFileSync(
						'BrokerDocs/ELog-' + message.Driver_Id +"-" + message.ELogDate + '.pdf'
					);
        
        attachments.push({
            type: 'application/pdf',
            name: 'Elog.pdf',
            content: new Buffer(bitmap).toString('base64')
        });
        
		var templateVariables = [
			{
				name: 'Body',
				content: message.Body ? message.Body : ''
			}
		];
        
        if(message.FromEmail) {
            if (message.Emails) {
                var emails = message.Emails.split(',');
                if (emails.length > 0) {
                    async.forEach(Object.keys(emails), function(i, cback) {
                        sendEmailFrom(emails[i], message.FromEmail,'invoice', templateVariables, attachments, message.Subject, function (err, result) {
                            cback(err, result);
                        });
                    }, function (err, result) {
                        cb(err, result);
                    });
                } else {
                    sendEmailFrom(message.Emails, message.FromEmail,'invoice', templateVariables, attachments, message.Subject, function (err, result) {
                        cb(err, result);
                    });
                }
            }
        } else {

		if (message.Emails) {
			var emails = message.Emails.split(',');
			if (emails.length > 0) {
				async.forEach(Object.keys(emails), function(i, cback) {
					sendEmail(emails[i], 'invoice', templateVariables, attachments, message.Subject, function (err, result) {
                        cback(err, result);
                        });
                }, function (err, result) {
                    cb(err, result);
                });
			} else {
				sendEmail(message.Emails, 'invoice', templateVariables, attachments, message.Subject, function (err, result) {
                        cb(err, result);
                    });
			}
		}
        }
	};

	module.exports.sendDirectionstoDriver = function(dispatch, driver, route) {
		var drivingDirections = '';
		var directions = JSON.parse(route.Directions);
		for (var i = 0; i < directions.length; i++) {
			//drivingDirections.push({steps (i+1): directions[i].Maneuver});
			drivingDirections += i + 1 + '. ' + directions[i].Maneuver + '\n';
		}
		var templateVariables = [
			{
				name: 'Body',
				content: drivingDirections
			}
		];
		sendEmail(driver.Email, 'invoice', templateVariables, [], 'Directions to Load Number' + dispatch.LoadNumber);
	};

	module.exports.SendLoadConfirmation = function(message, cb) {
		var attachments = [], bitmap = '';
		bitmap = fs.readFileSync('BrokerDocs/RateConfirmation-' + message.LoadNumber + '.pdf');
		attachments.push({
			type: 'application/pdf',
			name: 'RateConfirmation.pdf',
			content: new Buffer(bitmap).toString('base64')
		});
		var templateVariables = [
			{
				name: 'Body',
				content: 'Please find the attached Rate/Load Confirmation.'
			}
		];

		if (message.CustomerEmail)
			sendEmail(
				message.CustomerEmail,
				'invoice',
				templateVariables,
				attachments,
				message.CustomSubject ? message.CustomSubject : 'Rate/Load Confirmation-' + message.LoadNumber
			);

		if (message.UserEmail)
			sendEmail(
				message.UserEmail,
				'invoice',
				templateVariables,
				attachments,
				message.CustomSubject ? message.CustomSubject : 'Rate/Load Confirmation-' + message.LoadNumber
			);
		cb(null, 'Email sent');
	};

	module.exports.SendInvoiceAndOtherDocs = function(message, cb) {
		var attachments = [], images = [];
		for (var i = 0; i < message.Documents.length; i++) {
			var file = '';
			var bitmap = '';
			bitmap = fs.readFileSync(
				message.Documents[i].FilePath
			);
			attachments.push({
				type: 'application/pdf',
				name: message.Documents[i].FileName,
				content: new Buffer(bitmap).toString('base64')
			});

		}

		var templateVariables = [
			{
				name: 'Body',
				content: message.Body ? message.Body : ''
			}
		];

        if(message.FromEmail) {
            if (message.Emails) {
                var emails = message.Emails.split(';');
                if (emails.length > 0) {
                    async.forEach(Object.keys(emails), function(i, cback) {
                        sendEmailFrom(emails[i], message.FromEmail,'invoice', templateVariables, attachments, message.Subject, function (err, result) {
                            cback(err, result);
                        });
                    }, function (err, result) {
                        cb(err, result);
                    });
                } else {
                    sendEmailFrom(message.Emails, message.FromEmail,'invoice', templateVariables, attachments, message.Subject, function (err, result) {
                        cb(err, result);
                    });
                }
            }
        } else {
		if (message.Emails) {
			var emails = message.Emails.split(';');
			if (emails.length > 0) {
				async.forEach(Object.keys(emails), function(i, cback) {
					sendEmail(emails[i], 'invoice', templateVariables, attachments, message.Subject, function (err, result) {
                        cback(err, result);
                        });
                }, function (err, result) {
                    cb(err, result);
                });
			} else {
				sendEmail(message.Emails, 'invoice', templateVariables, attachments, message.Subject, function (err, result) {
                        cb(err, result);
                    });
			}
		}
        }
	};
})();
