(function () {
    'use strict';

    var plivo = require('plivo-node');
    var p = plivo.RestAPI(sails.config.plivo);
    var moment = require('moment'),
        async = require('async');

    /**
     * Send a SMS message to a given desitination
     * Example
     * 		sails.services['smsservice'].sendMessage(16505765403, "Welcome to etrucking software");
     * 		
     * @param  {String}   to        User number to send SMS to
     * @param  {String}   message   SMS Message body 
     * @param  {Function} callback  Callback function executed once the SMS is sent (optional)
     * @return  
     */
    module.exports.sendMessage = function (to, message,sendPhoneNum, callback) {
        
                var params = {
                    'src': sendPhoneNum,
                    'dst': to,
                    'text': message,
                    'type': "sms",
                };
                p.send_message(params, function (status, response) {
                    if (status === 202) {
                        if (callback) callback(null, response);
                    } else {
                        if (callback) callback(new Error(response.error))
                    }
                });
    };

    var sendSMSPhoneNumber = function (cb) {
        var dOModel = sails.models['smsphonenumbers'];
        var query = "CALL getSendSMSPhoneNumber()";
        dOModel.query(query, function (err, result) {
            if (err) {
                cb(err.message);
            } else {
                cb(null,result[0][0].PhoneNumber);
            }
        });
    }

    module.exports.sendDispatchMessage = function (dispatch, addresses, driver, pickups, deliverys, isDate24HrFormat) {

        var smsMsg = "",
            rateTxt = "";

        //         for (var a =0; a < addresses.length; a++ ) 
        //            {
        //                if(addresses[a].Id == dispatch.Shipper.Address)
        //                   var shipperAddress = addresses[a];
        //                if(addresses[a].Id == dispatch.Consignee.Address)
        //                    var consigneeAddress = addresses[a];
        //            } 


        if (dispatch.Company.SendAmountInfo && driver.IsOwnerOperator)
            rateTxt = "\nLoad Amount: $" + dispatch.ConfirmedAmount;

        var driverPhone = '1' + driver.Phone.replace("(", "").replace(")", "").replace("-", "").replace(" ", "").trim();
        var pickuptxt = '',
            deliverytxt = '';

        async.series({
            sendShipper: function (cb) {
                if (pickups.length > 0) pickuptxt = 'Pickup 1:\n';

                var loadSubject = "New Load# " + dispatch.LoadNumber;
                if (dispatch.SendMessage === true) loadSubject = "Updated Load# " + dispatch.LoadNumber;

                smsMsg = loadSubject + "\n" + "Truck #:" + dispatch.Truck.TruckNumber + "\n" + "Trailer #:" + dispatch.Trailer.TrailerNumber + rateTxt + "\n" + pickuptxt + "Pickup #:" + dispatch.PickupNumber +
                    "\nD&T:" + moment(dispatch.PickupAppointment).format('MM/DD/YY') + ' ' +
                    ((dispatch.PickupFromTime && dispatch.PickupToTime && (moment(dispatch.PickupToTime).tz('America/Los_Angeles').format('HH:mm') !== moment(dispatch.PickupFromTime).tz('America/Los_Angeles').format('HH:mm'))) ? ((isDate24HrFormat) ? (moment(dispatch.PickupFromTime).tz('America/Los_Angeles').format('HH:mm') + '-' + moment(dispatch.PickupToTime).tz('America/Los_Angeles').format('HH:mm')) : (moment(dispatch.PickupFromTime).tz('America/Los_Angeles').format('hh:mm a') + '-' + moment(dispatch.PickupToTime).tz('America/Los_Angeles').format('hh:mm a'))) : (dispatch.PickupFromTime ? (isDate24HrFormat ? moment(dispatch.PickupFromTime).tz('America/Los_Angeles').format('HH:mm') : moment(dispatch.PickupFromTime).tz('America/Los_Angeles').format('hh:mm a')) : '')) + "\n" + dispatch.Shipper.Name + "\n" + dispatch.Shipper.Address.Address1 + "\n" + dispatch.Shipper.Address.City + " " + dispatch.Shipper.Address.State + " " + dispatch.Shipper.Address.Zip;

                if (dispatch.Weight)
                    smsMsg += "\nWeight:" + dispatch.Weight;
                if (dispatch.PieceCount)
                    smsMsg += "\nPiece Ct:" + dispatch.PieceCount;
                if (dispatch.Pallets)
                    smsMsg += "\nPallets: " + dispatch.Pallets;
                if (dispatch.Goods)
                    smsMsg += "\nGoods:" + dispatch.Goods;
                if (dispatch.TrailerTemparature)
                    smsMsg += "\nTmp:" + dispatch.TrailerTemparature;
                if (dispatch.PickupNotes)
                    smsMsg += "\nNotes:" + dispatch.PickupNotes;

                sails.services['smsservice'].sendMessage(driverPhone, smsMsg, function (err, sentsms) {
                    cb(err, sentsms);
                });
            },
            sendAddPickups: function (cb) {
                var pickupsList = "",
                    i = 1;
                if (pickups.length > 0) {
                    async.forEach(Object.keys(pickups), function (a, cab) {
                        i += 1;
                        var smsMsg = "Pickup " + (pickups[a].PickupSeq ? (pickups[a].PickupSeq + 1) : i) + ":\nPickup #: " + pickups[a].PickupNumber +
                            "\nD&T:" + moment(pickups[a].AppointmentTime).format('MM/DD/YY') + ' ' +
                            ((pickups[a].EarliestAppointment && pickups[a].LatestAppointment && (moment(pickups[a].EarliestAppointment).tz('America/Los_Angeles').format('HH:mm') !== moment(pickups[a].LatestAppointment).tz('America/Los_Angeles').format('HH:mm'))) ? ((isDate24HrFormat) ? (moment(pickups[a].EarliestAppointment).tz('America/Los_Angeles').format('HH:mm') + '-' + moment(pickups[a].LatestAppointment).tz('America/Los_Angeles').format('HH:mm')) : (moment(pickups[a].EarliestAppointment).tz('America/Los_Angeles').format('hh:mm a') + '-' + moment(pickups[a].LatestAppointment).tz('America/Los_Angeles').format('hh:mm a'))) : ((pickups[a].EarliestAppointment && pickups[a].EarliestAppointment !== '0000-00-00 00:00:00') ? (isDate24HrFormat ? moment(pickups[a].EarliestAppointment).tz('America/Los_Angeles').format('HH:mm') : moment(pickups[a].EarliestAppointment).tz('America/Los_Angeles').format('hh:mm a')) : '')) + "\n" + pickups[a].ShipperName + "\n" + pickups[a].FromAddress;

                        //smsMsg += "\nWeight: "+ pickups[a].Weight+"\nPiece Count: " +pickups[a].PieceCount +"\nPallets: "+ pickups[a].Pallets+"\nGoods: "+ pickups[a].Goods+"\nTrailerTemparature: "+ pickups[a].TrailerTemparature;     
                        if (pickups[a].Weight)
                            smsMsg += "\nWeight: " + pickups[a].Weight;
                        if (pickups[a].PieceCount)
                            smsMsg += "\nPiece Ct: " + pickups[a].PieceCount;
                        if (pickups[a].Pallets)
                            smsMsg += "\nPallets: " + pickups[a].Pallets;
                        if (pickups[a].Goods)
                            smsMsg += "\nGoods: " + pickups[a].Goods;
                        if (pickups[a].TrailerTemparature)
                            smsMsg += "\nTmp: " + pickups[a].TrailerTemperature;
                        if (pickups[a].Notes)
                            smsMsg += "\nNotes: " + pickups[a].Notes;

                        sails.services['smsservice'].sendMessage(driverPhone, smsMsg, function (err, sent) {
                            cab();
                        });
                    }, function (err) {
                        cb(null, 'sent');
                    })
                } else {
                    cb(null, 'sent');
                }
            },
            sendConsignee: function (cb) {
                if (pickups.length > 0) deliverytxt = 'Delivery 1:\n';
                var smsMsgDel = deliverytxt + "Delivery #:" + dispatch.ConfirmationNumber + "\nD&T:" + moment(dispatch.PickupDeliveryAppointment).format('MM/DD/YY') + ' ' +
                    ((dispatch.DeliveryFromTime && dispatch.DeliveryToTime && dispatch.DeliveryFromTime !== '0000-00-00 00:00:00' && dispatch.DeliveryToTime !== '0000-00-00 00:00:00' && (moment(dispatch.DeliveryFromTime).tz('America/Los_Angeles').format('HH:mm') != moment(dispatch.DeliveryToTime).tz('America/Los_Angeles').format('HH:mm'))) ? ((isDate24HrFormat) ? (moment(dispatch.DeliveryFromTime).tz('America/Los_Angeles').format('HH:mm') + '-' + moment(dispatch.DeliveryToTime).tz('America/Los_Angeles').format('HH:mm')) : (moment(dispatch.DeliveryFromTime).tz('America/Los_Angeles').format('hh:mm a') + '-' + moment(dispatch.DeliveryToTime).tz('America/Los_Angeles').format('hh:mm a'))) : ((dispatch.DeliveryFromTime && dispatch.DeliveryFromTime !== '0000-00-00 00:00:00') ? (isDate24HrFormat ? moment(dispatch.DeliveryFromTime).tz('America/Los_Angeles').format('HH:mm') : moment(dispatch.DeliveryFromTime).tz('America/Los_Angeles').format('hh:mm a')) : '')) + "\n" + dispatch.Consignee.Name + "\n" + dispatch.Consignee.Address.Address1 + "\n" + dispatch.Consignee.Address.City + " " + dispatch.Consignee.Address.State + " " + dispatch.Consignee.Address.Zip;
                if (dispatch.DeliveryWeight)
                    smsMsgDel += "\nWeight:" + dispatch.DeliveryWeight;
                if (dispatch.DeliveryPieceCount)
                    smsMsgDel += "\nPiece Ct:" + dispatch.DeliveryPieceCount;
                if (dispatch.DeliveryPallets)
                    smsMsgDel += "\nPallets: " + dispatch.DeliveryPallets;
                if (dispatch.DeliveryGoods)
                    smsMsgDel += "\nGoods:" + dispatch.DeliveryGoods;
                if (dispatch.DeliveryTrailerTemperature)
                    smsMsgDel += "\nTmp:" + dispatch.DeliveryTrailerTemperature;
                if (dispatch.DeliveryNotes)
                    smsMsgDel += "\nNotes:" + dispatch.DeliveryNotes;

                sails.services['smsservice'].sendMessage(driverPhone, smsMsgDel, function (err, sentsms) {
                    cb(err, sentsms);
                });
            },
            sendAddDeliveries: function (cb) {
                var deliverytxt = '',
                    i = 1;
                if (deliverys.length > 0) {
                    async.forEach(Object.keys(deliverys), function (a, cab) {
                        i += 1;
                        var smsMsg = "Delivery " + (deliverys[a].PickupSeq ? (deliverys[a].PickupSeq + 1) : i) + ":\nD&T:" + moment(deliverys[a].DeliveryAppointmentTime).format('MM/DD/YY') + ' ' +
                            ((deliverys[a].EarliestAppointment && deliverys[a].LatestAppointment && (moment(deliverys[a].LatestAppointment).tz('America/Los_Angeles').format('HH:mm') != moment(deliverys[a].EarliestAppointment).tz('America/Los_Angeles').format('HH:mm'))) ? ((isDate24HrFormat) ? (moment(deliverys[a].EarliestAppointment).tz('America/Los_Angeles').format('HH:mm') + '-' + moment(deliverys[a].LatestAppointment).tz('America/Los_Angeles').format('HH:mm')) : (moment(deliverys[a].EarliestAppointment).tz('America/Los_Angeles').format('hh:mm a') + '-' + moment(deliverys[a].LatestAppointment).tz('America/Los_Angeles').format('hh:mm a'))) : ((deliverys[a].EarliestAppointment && deliverys[a].EarliestAppointment !== '0000-00-00 00:00:00') ? (isDate24HrFormat ? moment(deliverys[a].EarliestAppointment).tz('America/Los_Angeles').format('HH:mm') : moment(deliverys[a].EarliestAppointment).tz('America/Los_Angeles').format('hh:mm a')) : '')) + "\n" + deliverys[a].ConsigneeName + "\n" + deliverys[a].ToAddress;
                        if (deliverys[a].Weight)
                            smsMsg += "\nWeight: " + deliverys[a].Weight;
                        if (deliverys[a].PieceCount)
                            smsMsg += "\nPiece Ct: " + deliverys[a].PieceCount;
                        if (deliverys[a].Pallets)
                            smsMsg += "\nPallets: " + deliverys[a].Pallets;
                        if (deliverys[a].Goods)
                            smsMsg += "\nGoods: " + deliverys[a].Goods;
                        if (deliverys[a].TrailerTemparature)
                            smsMsg += "\nTmp: " + deliverys[a].TrailerTemperature;
                        if (deliverys[a].Notes)
                            smsMsg += "\nNotes: " + deliverys[a].Notes;

                        sails.services['smsservice'].sendMessage(driverPhone, smsMsg, function (err, sent) {
                            cab();
                        });
                    }, function (err) {
                        cb(null, 'sent');
                    });
                } else {
                    cb(null, 'sent');
                }
            }
        }, function (err, results) {
        });
    };
    
    module.exports.sendGPSCMDS = function (req, cb) {
        async.forEach(Object.keys(req.PhoneNumbers), function (e, cback) {
            sails.services['smsservice'].sendMessage(req.PhoneNumbers[e], req.Msg, function (err, sentsms)          {
                cback(err, 'Message sent successfully!');
            });
        }, function (err) {
            cb(err, 'Message sent successfully!');
        });
    };

    module.exports.sendCOMessage = function (req, calb) {
        var driverMsg = '',
        stopsHTML = '';
       sendSMSPhoneNumber(function(err, sendPhoneNum) {
            if (!err) {
                async.forEach(Object.keys(req), function (i, cback) {
                    if (req[i].FromDate === '0000-00-00')
                        req[i].FromDate = null;

                    if (req[i].ToDate === '0000-00-00 00:00:00')
                        req[i].ToDate = null;

                    if (req[i].FromTime === '0000-00-00 00:00:00')
                        req[i].FromTime = null;

                    if (req[i].ToTime === '0000-00-00 00:00:00')
                        req[i].ToTime = null;

                    stopsHTML = '';
                    var smsDetails = [];

                    if (req[i].StopNumber === 1)
                        stopsHTML = "Load#:" + req[i].CONumber + "\n";

                    stopsHTML += "Stop" + req[i].StopNumber + ":" + req[i].StopType + "\nPO#:" + req[i].PONumber +
                        "\nD&T:" + moment(req[i].FromDate).format('MM/DD/YY') + ' ' +
                        ((req[i].FromTime ? (req[0].IsDate24HrFormat ? moment(req[i].FromTime).format('HH:mm') : moment(req[i].FromTime).format('h:mm a')) : '')) +
                        (req[i].ToDate ? '-' + moment(req[i].ToDate).format('MM/DD/YY') : '') + ' ' +
                        ((req[i].ToTime ? (req[0].IsDate24HrFormat ? moment(req[i].ToTime).format('HH:mm') : moment(req[i].ToTime).format('h:mm a')) : '')) 

                        +"\n" + req[i].ContactName + "\n" + req[i].Address1 + " " + (req[i].Address2 ? req[i].Address2 : '') + req[i].City + " " + req[i].State + " " + req[i].Zip + "\n";

                    if (req[i].Weight)
                        stopsHTML += "Weight:" + req[i].Weight;
                    if (req[i].PieceCount)
                        stopsHTML += " Piece Ct:" + req[i].PieceCount;
                    if (req[i].Pallets)
                        stopsHTML += " Pallets: " + req[i].Pallets;
                    if (req[i].Notes)
                        stopsHTML += "\nNotes:" + req[i].Notes;

                    if(req[0].DriverPhoneNumber){
                        smsDetails.push({
                            'SMSMsg':stopsHTML,
                            'PhoneNumber':'1' + req[0].DriverPhoneNumber.replace("(", "").replace(")", "").replace("-", "").replace(" ", "").trim()
                        });
                    
                        sails.services['smsservice'].sendMessage(smsDetails[0].PhoneNumber, smsDetails[0].SMSMsg, sendPhoneNum, function (err, sentsms) {
                                cback(err, 'Message sent successfully!'); 
                            });
                    } else {
                        cback('Couldnot send SMS successfully!');
                    }
                }, function (err, results) {
                    calb(err, 'Sent Successfully!');
                });
            } else {
                calb('Error Occured while sending sms, please contact customer support.');
            }
        });
    };

    module.exports.sendDOMessage = function (info, calb) {
        var dr1smsMsg = '',
            dr2smsMsg = '',
            ownerOpMsg = '',
            stopsHTML = '',
            phoneNums = [],
            smsMsg = '',
            prioreqStops = '',
            latereqstops = '';
        sendSMSPhoneNumber(function(err, sendPhoneNum) {
            if (!err) {
                if (info[0].OwnerOpPhone && info[0].SendAmountInfo) {
                    ownerOpMsg = "Trip# " + info[0].DispatchNumber + "\n" + "Truck #:" + info[0].Truck + "\n" + "Trailer #:" + info[0].Trailer + "\nLoad Amount: $" + info[0].Amount + '\n';
        //            smsMsg = ownerOpMsg;
                    phoneNums.push({
                        'PhoneNumber': '1' + info[0].OwnerOpPhone.replace("(", "").replace(")", "").replace("-", "").replace(" ", "").trim(),
                        'SMSMsg': ownerOpMsg
                    });

                } else {

                    if (info[0].Driver1Phone) {
                        dr1smsMsg = "Trip# " + info[0].DispatchNumber + "\n" + "Truck #:" + info[0].Truck + "\n" + "Trailer #:" + info[0].Trailer;

                        if (info[0].SendAmountInfo && info[0].IsOwnerOperator1)
                            dr1smsMsg += "\nLoad Amount: $" + info[0].Amount + '\n';

        //                smsMsg = ownerOpMsg;
                        phoneNums.push({
                            'PhoneNumber': '1' + info[0].Driver1Phone.replace("(", "").replace(")", "").replace("-", "").replace(" ", "").trim(),
                            'SMSMsg': dr1smsMsg
                        });
                    }

                    if (info[0].Driver2Phone) {
                        dr2smsMsg = "Trip# " + info[0].DispatchNumber + "\n" + "Truck #:" + info[0].Truck + "\n" + "Trailer #:" + info[0].Trailer;

                        if (info[0].SendAmountInfo && info[0].IsOwnerOperator2)
                            dr2smsMsg += "\nLoad Amount: $" + info[0].Amount + '\n';

        //                smsMsg = ownerOpMsg;
                        phoneNums.push({
                            'PhoneNumber': '1' + info[0].Driver2Phone.replace("(", "").replace(")", "").replace("-", "").replace(" ", "").trim(),
                            'SMSMsg': dr2smsMsg
                        });
                    }
                }

                async.forEach(Object.keys(phoneNums), function (p, cback) {
                    sails.services['smsservice'].sendMessage(phoneNums[p].PhoneNumber, phoneNums[p].SMSMsg, sendPhoneNum, function (err, sentsms) {
                        cback(err, sentsms);
                    });
                }, function (err, sentSMS) {
        //            calb(err, sentSMS);
                })

                async.series({
                    PriorEqStops: function (cb) {
                        if (info[0].EquipmentStops.length > 0) {
                            prioreqStops = 'Prior EQ Stops:\n'
                            var eqstops = info[0].EquipmentStops;
                            async.forEach(Object.keys(eqstops), function (e, cback) {
                                if (eqstops[e].IsPriorStops) {
                                    prioreqStops = '';
                                    var phoneNumsEq = [];
                                    prioreqStops = "Stop " + (parseInt(e) + 1) + ": " + eqstops[e].StopType +"\nEQ Type:" + eqstops[e].EquipmentType +
                                        "\nD&T:" + moment(eqstops[e].StopDate).format('MM/DD/YY') +
                                        ' ' +
        //                                (eqstops[e].StopDate ? moment(eqstops[e].StopDate).format('HH:mm') : '') +
                                        (eqstops[e].StopTime ? moment(eqstops[e].StopTime).format('h:mm a') : '') +

                                        +"\n" + eqstops[e].ContactName + "\n" + eqstops[e].Address1 + " " + (eqstops[e].Address2 ? eqstops[e].Address2 : '') + eqstops[e].City + " " + eqstops[e].State + " " + eqstops[e].Zip + "\n";


                                    if (info[0].OwnerOpPhone && info[0].SendAmountInfo) {
        //                                smsMsg = prioreqStops;
                                        phoneNumsEq.push({
                                            'PhoneNumber': '1' + info[0].OwnerOpPhone.replace("(", "").replace(")", "").replace("-", "").replace(" ", "").trim(),
                                            'SMSMsg': prioreqStops
                                        });

                                    } else {

                                        if (info[0].Driver1Phone) {
        //                                    smsMsg = prioreqStops;
                                            phoneNumsEq.push({
                                                'PhoneNumber': '1' + info[0].Driver1Phone.replace("(", "").replace(")", "").replace("-", "").replace(" ", "").trim(),
                                                'SMSMsg': prioreqStops
                                            });
                                        }

                                        if (info[0].Driver2Phone) {
        //                                    smsMsg = prioreqStops;
                                            phoneNumsEq.push({
                                                'PhoneNumber': '1' + info[0].Driver2Phone.replace("(", "").replace(")", "").replace("-", "").replace(" ", "").trim(),
                                                'SMSMsg': prioreqStops
                                            });
                                        }
                                    }

                                    async.forEach(Object.keys(phoneNumsEq), function (p, cb) {
                                        sails.services['smsservice'].sendMessage(phoneNumsEq[p].PhoneNumber, phoneNumsEq[p].SMSMsg,sendPhoneNum, function (err, sentsms) {
                                            cb(err, sentsms);
                                        });
                                    }, function (err, sentSMS) {
                                            cback();
                                    });
        //                            cback();
                                } else
                                    cback();
                            }, function () {
                                cb();
                            });
                        } else
                            cb();
                    },

                    Stops: function (cb) {
                        async.forEach(Object.keys(info), function (i, cback) {
                            if (info[i].FromDate === '0000-00-00')
                                info[i].FromDate = null;

                            if (info[i].ToDate === '0000-00-00 00:00:00')
                                info[i].ToDate = null;

                            if (info[i].FromTime === '0000-00-00 00:00:00')
                                info[i].FromTime = null;

                            if (info[i].ToTime === '0000-00-00 00:00:00')
                                info[i].ToTime = null;
                            stopsHTML = '';
                            var phoneNumsStops = [];
                            stopsHTML = "Stop" + info[i].StopNumber + ":" + info[i].StopType + "\nPO#:" + info[i].PONumber +
                                "\nD&T:" + moment(info[i].FromDate).format('MM/DD/YY') + ' ' +
                                ((info[i].FromTime ? (info[0].IsDate24HrFormat ? moment(info[i].FromTime).format('HH:mm') : moment(info[i].FromTime).format('h:mm a')) : '')) +
                                (info[i].ToDate ? '-' + moment(info[i].ToDate).format('MM/DD/YY') : '') + ' ' +
                                ((info[i].ToTime ? (info[0].IsDate24HrFormat ? moment(info[i].ToTime).format('HH:mm') : moment(info[i].ToTime).format('h:mm a')) : '')) 

                                +"\n" + info[i].ContactName + "\n" + info[i].Address1 + " " + (info[i].Address2 ? info[i].Address2 : '') + info[i].City + " " + info[i].State + " " + info[i].Zip + "\n";

                            if (info[i].Weight)
                                stopsHTML += "Weight:" + info[i].Weight;
                            if (info[i].PieceCount)
                                stopsHTML += " Piece Ct:" + info[i].PieceCount;
                            if (info[i].Pallets)
                                stopsHTML += " Pallets: " + info[i].Pallets;
                            if (info[i].Commodity)
                                stopsHTML += " Goods:" + info[i].Commodity;
                            if (info[i].TrailerTemparature)
                                stopsHTML += " Tmp:" + info[i].TrailerTemparature;
                            if (info[i].Notes)
                                stopsHTML += "\nNotes:" + info[i].Notes;

                            stopsHTML += "";

                            if (info[0].OwnerOpPhone && info[0].SendAmountInfo) {
        //                        smsMsg = stopsHTML;
                                phoneNumsStops.push({
                                    'PhoneNumber': '1' + info[0].OwnerOpPhone.replace("(", "").replace(")", "").replace("-", "").replace(" ", "").trim(),
                                    'SMSMsg': stopsHTML
                                });

                            } else {

                                if (info[0].Driver1Phone) {
        //                            smsMsg = stopsHTML;
                                    phoneNumsStops.push({
                                        'PhoneNumber': '1' + info[0].Driver1Phone.replace("(", "").replace(")", "").replace("-", "").replace(" ", "").trim(),
                                        'SMSMsg': stopsHTML
                                    });
                                }

                                if (info[0].Driver2Phone) {
        //                            smsMsg = stopsHTML;
                                    phoneNumsStops.push({
                                        'PhoneNumber': '1' + info[0].Driver2Phone.replace("(", "").replace(")", "").replace("-", "").replace(" ", "").trim(),
                                        'SMSMsg': stopsHTML
                                    });
                                }
                            }
                            async.forEach(Object.keys(phoneNumsStops), function (p, cb) {
                                sails.services['smsservice'].sendMessage(phoneNumsStops[p].PhoneNumber, phoneNumsStops[p].SMSMsg, sendPhoneNum, function (err, sentsms) {
                                    cb(err, sentsms);
                                });
                            }, function (err, sentSMS) {
        //                            cback();
                            });
                            cback();
                        }, function (err, results) {
                            cb();
                        });
                    },
                    LaterEQStops: function (cb) {
                        if (info[0].EquipmentStops.length > 0) {
                            latereqstops = 'Later EQ Stops:\n';
                            var eqstops = info[0].EquipmentStops;
                            async.forEach(Object.keys(eqstops), function (e, cback) {
                                if (!eqstops[e].IsPriorStops) {
                                    latereqstops = '';
                                    var phoneNumsLEq = [];
                                    latereqstops = "Stop" + (e + 1) + ":" + eqstops[e].StopType +"\nEQ Type:" + eqstops[e].EquipmentType +
                                        "\nD&T:" + moment(eqstops[e].StopDate).format('MM/DD/YY') + 
                                        ' ' +
        //                                (eqstops[e].StopDate ? moment(eqstops[e].StopDate).format('HH:mm') : '') +
                                        (eqstops[e].StopTime ? moment(eqstops[e].StopTime).format('h:mm a') : '') +

                                        +"\n" + eqstops[e].ContactName + "\n" + eqstops[e].Address1 + " " + (eqstops[e].Address2 ? eqstops[e].Address2 : '') + eqstops[e].City + " " + eqstops[e].State + " " + eqstops[e].Zip + '\n';

                                    if (info[0].OwnerOpPhone && info[0].SendAmountInfo) {
        //                                smsMsg = latereqstops;
                                        phoneNumsLEq.push({
                                            'PhoneNumber': '1' + info[0].OwnerOpPhone.replace("(", "").replace(")", "").replace("-", "").replace(" ", "").trim(),
                                            'SMSMsg': latereqstops
                                        });

                                    } else {

                                        if (info[0].Driver1Phone) {
        //                                    smsMsg = latereqstops;
                                            phoneNumsLEq.push({
                                                'PhoneNumber': '1' + info[0].Driver1Phone.replace("(", "").replace(")", "").replace("-", "").replace(" ", "").trim(),
                                                'SMSMsg': latereqstops
                                            });
                                        }

                                        if (info[0].Driver2Phone) {
        //                                    smsMsg = latereqstops;
                                            phoneNumsLEq.push({
                                                'PhoneNumber': '1' + info[0].Driver2Phone.replace("(", "").replace(")", "").replace("-", "").replace(" ", "").trim(),
                                                'SMSMsg': latereqstops
                                            });
                                        }
                                    }

                                    async.forEach(Object.keys(phoneNumsLEq), function (p, cb) {
                                        sails.services['smsservice'].sendMessage(phoneNumsLEq[p].PhoneNumber, phoneNumsLEq[p].SMSMsg, sendPhoneNum, function (err, sentsms) {
                                            cb(err, sentsms);
                                        });
                                    }, function (err, sentSMS) {
                                            cback();
                                    });
        //                            cback();
                                } else
                                    cback();
                            }, function () {
                                cb();
                            });
                        } else
                            cb();
                    }
                }, function () {
        //            if (info[0].OwnerOpPhone && info[0].SendAmountInfo) {
        //
        //                ownerOpMsg = "Trip# " + info[0].DispatchNumber; + "\n" + "Truck #:" + info[0].Truck + "\n" + "Trailer #:" + info[0].Trailer + "\nLoad Amount: $" + info[0].Amount + '\n';
        //                smsMsg = ownerOpMsg + prioreqStops + stopsHTML + latereqstops;
        //                phoneNums.push({
        //                    'PhoneNumber': '1' + info[0].OwnerOpPhone.replace("(", "").replace(")", "").replace("-", "").replace(" ", "").trim(),
        //                    'SMSMsg': smsMsg
        //                });
        //
        //            } else {
        //
        //                if (info[0].Driver1Phone) {
        //                    dr1smsMsg = "Trip# " + info[0].DispatchNumber; + "\n" + "Truck #:" + info[0].Truck + "\n" + "Trailer #:" + info[0].Trailer;
        //
        //                    if (info[0].SendAmountInfo && info[0].IsOwnerOperator1)
        //                        dr1smsMsg += "\nLoad Amount: $" + info[0].Amount + '\n';
        //
        //                    smsMsg = ownerOpMsg + prioreqStops + stopsHTML + latereqstops;
        //                    phoneNums.push({
        //                        'PhoneNumber': '1' + info[0].Driver1Phone.replace("(", "").replace(")", "").replace("-", "").replace(" ", "").trim(),
        //                        'SMSMsg': smsMsg
        //                    });
        //                }
        //
        //                if (info[0].Driver2Phone) {
        //                    dr2smsMsg = "Trip# " + info[0].DispatchNumber; + "\n" + "Truck #:" + info[0].Truck + "\n" + "Trailer #:" + info[0].Trailer;
        //
        //                    if (info[0].SendAmountInfo && info[0].IsOwnerOperator2)
        //                        dr2smsMsg += "\nLoad Amount: $" + info[0].Amount + '\n';
        //
        //                    smsMsg = ownerOpMsg + prioreqStops + stopsHTML + latereqstops;
        //                    phoneNums.push({
        //                        'PhoneNumber': '1' + info[0].Driver2Phone.replace("(", "").replace(")", "").replace("-", "").replace(" ", "").trim(),
        //                        'SMSMsg': smsMsg
        //                    });
        //                }
        //            }
        //
        //            async.forEach(Object.keys(phoneNums), function (p, cback) {
        //                sails.services['smsservice'].sendMessage(phoneNums[p].PhoneNumber, phoneNums[p].SMSMsg, function (err, sentsms) {
        //                    cback(err, sentsms);
        //                });
        //            }, function (err, sentSMS) {
        //                calb(err, sentSMS);
        //            })
                    calb(null, 'Sent Successfully!');
                });
            } else {
                calb('Error Occured while sending sms, please contact customer support.');
            }
        });
    };

    module.exports.sendDispatchSplitLoadMessage = function (dispatch, splitLoad, driver, addresses) {

        for (var a = 0; a < addresses.length; a++) {
            if (addresses[a].Id == splitLoad.Shipper.Address)
                var shipperAddress = addresses[a];
            if (addresses[a].Id == splitLoad.Consignee.Address)
                var consigneeAddress = addresses[a];
        }

        var smsMsg = "New Load Assigned \nLoad# " + dispatch.LoadNumber +
            "\n\nPickup DateTime:" + moment(splitLoad.PickupDate).tz('America/Los_Angeles').format('MM/DD/YYYY') + ' ' + moment(splitLoad.PickupFromTime).tz('America/Los_Angeles').format('hh:mm a') + ' ' + moment(splitLoad.PickupToTime).tz('America/Los_Angeles').format('hh:mm a') + "\n" +
            "Pickup Address: \n" +
            shipperAddress.Address1 + "\n" + shipperAddress.City + " " + shipperAddress.State + " " + shipperAddress.Zip +
            "\n\nDelivery DateTime:" + moment(splitLoad.DeliveryDate).tz('America/Los_Angeles').format('MM/DD/YYYY') + ' ' + moment(splitLoad.DeliveryFromTime).tz('America/Los_Angeles').format('hh:mm a') + ' ' + moment(splitLoad.DeliveryToTime).tz('America/Los_Angeles').format('hh:mm a') + "\n" +
            "Delivery Address: \n" +
            consigneeAddress.Address1 + "\n" + consigneeAddress.City + " " + consigneeAddress.State + " " + consigneeAddress.Zip + "\nPiece Count: " + dispatch.PieceCount + "\nPallets: " + dispatch.Pallets;

        var driverPhone = driver.Phone.replace("(", "").replace(")", "").replace("-", "").replace(" ", "").trim();
        var driverPhone = parseInt("1" + driverPhone);
        sails.services['smsservice'].sendMessage(driverPhone, smsMsg);

    };


    module.exports.sendBulkMessage = function (driver, smsMsg) {
        sendSMSPhoneNumber(function(err, sendPhoneNum) {
            if (!err) {
                var driverPhone = driver.Phone.replace("(", "").replace(")", "").replace("-", "").replace(" ", "").trim();
                var driverPhone = parseInt("1" + driverPhone);

                sails.services['smsservice'].sendMessage(driverPhone, smsMsg,sendPhoneNum );
                                                         
            } 
        });
    };



})();
