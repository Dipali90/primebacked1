(function () {
    'use strict';
    var _ = require('lodash'),
        async = require('async'),
        soap = require('soap');


    module.exports.DOCalculateMiles = function (info, cback) {

        //          return response.json(200, {Status : 'Success', Message:"We are working on making some changes to calculating miles.Thank you for your Co-operation."});
        //response.json(200, []);
        var doIds = info.DOIds;
        var errorMSG = [], DOMiles = {}, RelayMiles = [], companyValidationErr = '';
        async.forEach(Object.keys(doIds), function (i, cb) {
            try {
                var doModel = sails.models['dispatchorder'];
                var query = "select do.Id,do.Company_Id, sa.Zip as StartZip, ea.Zip as EndZip, count(r.Id) as Relays, do.Company_Id as Company,do.Carrier_Id, co.RunMiles, co.IFTARouteMethod from dispatchorder do LEFT JOIN address sa on sa.Id = do.StartingLocation_Id LEFT JOIN address ea on ea.Id = do.EndingLocation_Id LEFT JOIN relay r on r.DispatchOrder_Id = do.Id left join company co On co.Id = do.Company_Id where do.Id =" + doIds[i];
                doModel.query(query, function (err, dOrder) {
                    if (err) {
                        cback(err.message);
                    } else {
                        if (dOrder[0].RunMiles) {
                            AddressList(dOrder[0], function (err, result) {
                                if(!err) {
                                    result.DOrder.IFTARouteMethod = dOrder[0].IFTARouteMethod
                                    if (!err) {
                                        if (!dOrder[0].Carrier_Id) {
                                            iftaSoapCall(result.DOrder, 0, dOrder[0].Company_Id, function (err, results) {
                                                if (err && err != 'Less than 2 trip legs sent in.') {
                                                    errorMSG.push(err);
                                                    cb();
                                                } else {
                                                    if (result.Relays.length > 0) {
                                                        if (!err) {
                                                            DOMiles = results.Miles;
                                                        
                                                            updatelineitems(doIds[i], DOMiles, 0, function (err, res) {});
                                                        }
                                                        
                                                        async.forEach(Object.keys(result.Relays), function (item, callb) {
                                                            if(result.Relays[item].Carrier_Id) {
                                                                RelayMiles.push({RelayId: result.Relays[item].Id, Miles:{}});                   
                                                                callb();
                                                            } else {
                                                                iftaSoapCall(result.Relays[item], 1, dOrder[0].Company_Id, function (err, results) {
                                                                    if (err)
                                                                        errorMSG.push(err);
                                                                    else {
                                                                        RelayMiles.push({RelayId: result.Relays[item].Id, Miles:results.Miles});                                                                                                                updatelineitems(result.Relays[item].Id, results.Miles, 1, function (err, res) {});
                                                                    }
                                                                    callb();
                                                                });
                                                            }
                                                        }, function (err) {
                                                            cb();
                                                        })
                                                    } else {
                                                        if (err) {
                                                            errorMSG.push(err);
                                                            cb();
                                                        } else {
                                                            DOMiles = results.Miles;
                                                            updatelineitems(doIds[i], DOMiles, 0, function (err, res) {});
                                                            cb();
                                                        }
                                                    }
                                                }
                                            });
                                        } else {
                                            if (result.Relays.length > 0) {
        //                                        if (!err) {
        //                                            DOMiles = results.Miles;
        //
        //                                            updatelineitems(doIds[i], DOMiles, 0, function (err, res) {});
        //                                        }

                                                async.forEach(Object.keys(result.Relays), function (item, callb) {
                                                    if(result.Relays[item].Carrier_Id) {
                                                        RelayMiles.push({RelayId: result.Relays[item].Id, Miles:{}});                   
                                                        callb();
                                                    } else {
                                                        iftaSoapCall(result.Relays[item], 1, dOrder[0].Company_Id, function (err, results) {
                                                            if (err)
                                                                errorMSG.push(err);
                                                            else {
                                                                RelayMiles.push({RelayId: result.Relays[item].Id, Miles:results.Miles});                                                                                                                updatelineitems(result.Relays[item].Id, results.Miles, 1, function (err, res) {});
                                                            }
                                                            callb();
                                                        });
                                                    }
                                                }, function (err) {
                                                    cb();
                                                })
                                            } else {
        //                                        if (err) {
        //                                            errorMSG.push(err);
        //                                            cb();
        //                                        } else {
        //                                            DOMiles = results.Miles;
        //                                            updatelineitems(doIds[i], DOMiles, 0, function (err, res) {});
                                                    cb();
        //                                        }
                                            }
                                        }   
                                    } else {
                                        errorMSG.push(err);
                                        cb();
                                    }
                                } else 
                                    cb();
                            });
                        } else {
                            companyValidationErr = 'Your account is not subscribed to run the miles.';
                            cb();
                        }
                    }
                });
            } catch (e) {
                cb(e);
            }
        }, function (err) {
            
            if (companyValidationErr)
                return cback(null, { Status: 'Success',Message: companyValidationErr });
            
            if (errorMSG.length > 0) {
                cback(null, {
                    Status: 'Error',
                    Message: errorMSG
                });
            } else
                cback(null, {
                    Status: 'Success',
                    Message: "IFTA ran successfully",
                    Data: {DO: DOMiles, RelaysMiles: RelayMiles}
                });
        });
    };
    
    module.exports.WOCalculateMiles = function (info, cback) {
        var woIds = info.WOIds;
        var errorMSG = [], WOMiles = {};
        async.forEach(Object.keys(woIds), function (i, cb) {
            AddressWOList(woIds[i], function (err, result) {
                if (!err) {
                    iftaWOSoapCall(result.WOrder, function (err, results) {
                        if (err) {
                            errorMSG.push(err);
                            cb();
                        } else {
                            WOMiles = results.Miles;
                            cb();
                        }
                    });
                }
            });
        }, function (err) {
            if (errorMSG.length > 0) {
                cback(null, {
                    Status: 'Error',
                    Message: errorMSG
                });
            } else
                cback(null, {
                    Status: 'Success',
                    Message: "IFTA ran successfully",
                    Data: {WO: WOMiles}
                });
        });
    };

    var iftaSoapCall = function (load, IsRelay, company_Id, cb) {
        var tripLeg = [], addressstr = '', type = '', typeId = 0;
        for (var i = 0; i < load.Zips.length; i++) {
            tripLeg.push({
                Address: '',
                Latitude: 0,
                Longitude: 0,
                LocationText: load.Zips[i],
                Type: 'PROMILES',
                PerMileRate: 0,
                FlatRate: 0
            });
            
            if((load.Zips.length -1) === i)
                addressstr += load.Zips[i];
            else
                addressstr += load.Zips[i] + '$$$';
        }
        if (IsRelay) {
            type = 'Relay';
            typeId = load.Id;
        } else {
            type = 'DispatchOrder';
            typeId = load.Id;
        }
        
        var wOModel = sails.models['taxsummary'];
        var query = "CALL gettaxandstatetaxsummary('"+ type + "','" + addressstr + "')";
        wOModel.query(query, function (err, taxsummaryResult) {
            
            taxsummaryResult = taxsummaryResult[0];
            if(taxsummaryResult.length > 0 && taxsummaryResult[0].LoadedMiles > 0 && company_Id !== 484 ) {
                // console.log('inside the db....');
                var taxSummary = taxsummaryResult[0];
//                taxSummary.WorkOrder_Id = load.Id;
                delete taxSummary.Id;
                delete taxSummary.id;
                delete taxSummary.createdAt;
                
                if (IsRelay) {
                    sails.models['relay']
                        .update({
                            Id: load.Id
                        }, {
                            Loadedmiles: taxSummary.LoadedMiles,
                            DeadheadedBefore: taxSummary.DeadHeadedBefore,
                            DeadheadedAfter: taxSummary.DeadHeadedAfter
                        })
                        .exec(function callback(error, result) {
                            result.Miles = {
                                            Loadedmiles: taxSummary.LoadedMiles,
                                            DeadheadedBefore: taxSummary.DeadHeadedBefore,
                                            DeadheadedAfter: taxSummary.DeadHeadedAfter
                                        };
                            cb(null, result);
                        });
                } else {
                    sails.models['dispatchorder']
                        .update({
                            Id: load.Id
                        }, {
                            Loadedmiles: taxSummary.LoadedMiles,
                            DeadheadedBefore: taxSummary.DeadHeadedBefore,
                            DeadheadedAfter: taxSummary.DeadHeadedAfter
                        })
                        .exec(function callback(error, result) {
                            result.Miles = {
                                            Loadedmiles: taxSummary.LoadedMiles,
                                            DeadheadedBefore: taxSummary.DeadHeadedBefore,
                                            DeadheadedAfter: taxSummary.DeadHeadedAfter
                                        };
                            cb(null, result);
                        });
                }
                
                if (IsRelay)
                    taxSummary.Relay_Id = load.Id;
                else 
                    taxSummary.DispatchOrder_Id = load.Id;

                var wOModel = sails.models['taxsummary'];
                var query = "CALL deletetaxandstatetaxsummary(" + typeId + ",'" + type + "')";              
                wOModel.query(query, function (err, result) {
                
                    sails.models['taxsummary']
                     .create(taxSummary)
                     .exec(function callback(error, createdTaxSummary) {
                        var statetaxes = taxSummary.stateTaxSummary ? JSON.parse('[' + taxSummary.stateTaxSummary + ']') : [];
                        stateTaxSummary(statetaxes, createdTaxSummary.id, function (err, createdstatetaxes) {
    //                        cb(err, dispatch);
                        });
                    }); 
                });
            } else {
                var url = 'http://prime.promiles.com/Webservices/v1/PRIMEStandardV1.asmx?WSDL';
                var args = {
                    c: {
                        Username: 'sedd19',
                        Password: 'lirc04',
                        CompanyCode: 'LISE'
                    },
                    Trip: {
                        TripLegs: {
                            TripLeg: tripLeg
                        },
                        TripStartDate: '2015-09-18T00:00:00',
                        TripEndDate: '2015-09-19T00:00:00',
                        UnitMPG: 5.5,
                        GetMapPoints: true,
                        StartOdometer: 0,
                        EndOdometer: 0,
                        GetStaticTripMap: true,
                        TripMap: {
                            MapWidth: 800,
                            MapHeight: 400,
                            MetersAcross: 0,
                            CenterLatitude: 0,
                            CenterLongitude: 0
                        },
                        Options: {
                            Routing: {
                                RoutingMethod: load.IFTARouteMethod,
                                AllowRelaxRestrictions: 1
                            },
                            Itinerary: {},
                            FuelOptimization: {},
                            AllowRelaxRestrictions: 1
                        },
                        GetDrivingDirections: true,
                        GetStateBreakout: true,
                        GetFuelOptimization: true,
                        GetTripSummary: true,
                        GetItinerary: true,
                        GetTruckStopsOnRoute: true,
                        GetTaxSummary: true
                    }
                };

                soap.createClient(url, function (err, client) {
                    if (err) {
                         return cb('Calculating miles some error occured, Please try after some time.');
                    } else {
                        client.RunTrip(args, function (err, results) {
                        if (err) {
                            cb(err.message);
                        } else {
                            if (results.RunTripResult.ResponseStatus === 'USER_ERROR')
                                return cb(results.RunTripResult.ResponseMessage);

                            if (results.RunTripResult.ResponseStatus === 'BAD_TRIP_LOCATION') {
                                return cb(results.RunTripResult.ResponseMessage);
                            }

                            if(results.RunTripResult.Results === undefined)
                                return cb('No result from Promiles');

                            var legs = results.RunTripResult.Results.TripSummary.TripSummaryRow;
                            var dHMilesBefore = 0,
                                dHMilesAfter = 0,
                                loadedMiles = 0;
                            
                            if (legs === undefined || legs.length <= 0)
                                return cb('No result from Promiles');
                            
                            var index = 1;
                            if (load.StartZip  && !load.SameStart) {
                                try
                                {
                                    dHMilesBefore += parseFloat(legs[index].LegMiles);
                                }
                                catch(err)
                                {
                                    console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');
                                    console.log('Errored calculated before miles......', load.Id);
                                    dHMilesBefore += 0; 
                                }
                                index += 1;
                            }

                            if (load.PriorEqStopsCt > 0) {
                                for (var i = 0; i < (load.PriorEqStopsCt - 1); i++) {
                                    loadedMiles += parseFloat(legs[index].LegMiles);
                                    index += 1;
                                }
                            }

                            if (load.StopsCount > 0) {
                                for (var i = 0; i < (load.StopsCount - 1); i++) {
                                    try{
                                        loadedMiles += (legs[index].LegMiles ? parseFloat(legs[index].LegMiles) : 0);
                                    }
                                    catch(err)
                                    {
                                        console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');
                                        console.log('Errored calculated miles......', load.Id);
                                        loadedMiles += 0; 
                                    }
                                    index += 1;
                                }
                            }

                            if (load.LaterEqStopsCt > 0) {
                                for (var i = 0; i < (load.LaterEqStopsCt - 1); i++) {
                                    loadedMiles += parseFloat(legs[index].LegMiles);
                                    index += 1;
                                }
                            }

                            if (load.EndZip && !load.SameEnd) {
                                try
                                {
                                    dHMilesAfter += parseFloat(legs[index].LegMiles);
                                }
                                catch(err)
                                {
                                    console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');
                                    console.log('Errored calculated after miles......', load.Id);
                                    dHMilesAfter += 0; 
                                }
                                index += 1;
                            }

                            if (IsRelay) {
                                sails.models['relay']
                                    .update({
                                        Id: load.Id
                                    }, {
                                        Loadedmiles: loadedMiles,
                                        DeadheadedBefore: dHMilesBefore,
                                        DeadheadedAfter: dHMilesAfter
                                    })
                                    .exec(function callback(error, result) {
                                        result.Miles = {
                                                        Loadedmiles: loadedMiles,
                                                        DeadheadedBefore: dHMilesBefore,
                                                        DeadheadedAfter: dHMilesAfter
                                                    };
                                        cb(null, result);
                                    });
                            } else {
        //                        var obj = {
        //                            Loadedmiles: loadedMiles,
        //                            DeadheadedBefore: dHMilesBefore,
        //                            DeadheadedAfter: dHMilesAfter
        //                        };
                                sails.models['dispatchorder']
                                    .update({
                                        Id: load.Id
                                    }, {
                                        Loadedmiles: loadedMiles,
                                        DeadheadedBefore: dHMilesBefore,
                                        DeadheadedAfter: dHMilesAfter
                                    })
                                    .exec(function callback(error, result) {
                                        result.Miles = {
                                                        Loadedmiles: loadedMiles,
                                                        DeadheadedBefore: dHMilesBefore,
                                                        DeadheadedAfter: dHMilesAfter
                                                    };
                                        cb(null, result);
                                    });
                            }

                            var taxSummary = results.RunTripResult.Results;                    
                            saveMiles(taxSummary, null, load.Id, IsRelay, addressstr, function (err, saved) {});
                        }
                    })
                    }
                });
            }
        });
    };
    
    var iftaWOSoapCall = function (load, cb) {
        var tripLeg = [], addressstr = '';//console.log('load...', load);
        for (var i = 0; i < load.Zips.length; i++) {
            tripLeg.push({
                Address: '',
                Latitude: 0,
                Longitude: 0,
                LocationText: load.Zips[i],
                Type: 'PROMILES',
                PerMileRate: 0,
                FlatRate: 0
            });
            
            if((load.Zips.length -1) === i)
                addressstr += load.Zips[i];
            else
                addressstr += load.Zips[i] + '$$$';
        }
        
        var wOModel = sails.models['taxsummary'];
        var query = "CALL gettaxandstatetaxsummary('WorkOrder','" + addressstr + "')";
        wOModel.query(query, function (err, taxsummaryResult) {
            
            var taxSummary = taxsummaryResult[0];
            
            if(taxsummaryResult.length > 0) {
                taxSummary.WorkOrder_Id = load.Id;
                delete taxSummary.Id;
                delete taxSummary.id;
                delete taxSummary.createdAt;
                
                sails.models['workorder']
                .update({
                    Id: load.Id
                }, {
                    Miles: taxSummary.TotalMiles,
                    RateperMile: (taxSummary.TotalMiles/ load.Amount).toFixed(2)
                })
                .exec(function callback(error, result) {
                    result.Miles = {
                                        Miles: taxSummary.TotalMiles,
                                        RateperMile: (taxSummary.TotalMiles/ load.Amount).toFixed(2)
                                    };
                });
                
                var wOModel = sails.models['taxsummary'];
                var query = "CALL deletetaxandstatetaxsummary(" + load.Id + ",'WorkOrder')";              
                wOModel.query(query, function (err, result) {
//                    console.log('query...',query);
//                    console.log('err...',err);
//                    console.log('result...',result);

                    sails.models['taxsummary']
                     .create(taxSummary)
                     .exec(function callback(error, createdTaxSummary) {

                        stateTaxSummary(statetaxes, createdTaxSummary.id, function (err, createdstatetaxes) {
    //                        cb(err, dispatch);
                        });
                    });
                });
            } else {

             var url = 'http://prime.promiles.com/Webservices/v1/PRIMEStandardV1.asmx?WSDL';
            var args = {
                c: {
                    Username: 'sedd19',
                    Password: 'lirc04',
                    CompanyCode: 'LISE'
                },
                Trip: {
                    TripLegs: {
                        TripLeg: tripLeg
                    },
                    TripStartDate: '2015-09-18T00:00:00',
                    TripEndDate: '2015-09-19T00:00:00',
                    UnitMPG: 5.5,
                    GetMapPoints: true,
                    StartOdometer: 0,
                    EndOdometer: 0,
                    GetStaticTripMap: true,
                    TripMap: {
                        MapWidth: 800,
                        MapHeight: 400,
                        MetersAcross: 0,
                        CenterLatitude: 0,
                        CenterLongitude: 0
                    },
                    Options: {
                        Routing: {
                            RoutingMethod: load.IFTARouteMethod
                        },
                        Itinerary: {},
                        FuelOptimization: {},
                    },
                    GetDrivingDirections: true,
                    GetStateBreakout: true,
                    GetFuelOptimization: true,
                    GetTripSummary: true,
                    GetItinerary: true,
                    GetTruckStopsOnRoute: true,
                    GetTaxSummary: true
                }
            };

            soap.createClient(url, function (err, client) {
                client.RunTrip(args, function (err, results) {
                    if (err) {
                        cb(err.message);
                    } else {
                        if (results.RunTripResult.ResponseStatus === 'USER_ERROR')
                            return cb(results.RunTripResult.ResponseMessage);

                        if (results.RunTripResult.ResponseStatus === 'BAD_TRIP_LOCATION') {
                            return cb(results.RunTripResult.ResponseMessage);
                        }

//                        console.log('results.RunTripResult.Results...',results.RunTripResult);
                        if(results.RunTripResult.Results === undefined)
                            return cb('No result from Promiles');

                        var legs = results.RunTripResult.Results.TripSummary.TripSummaryRow;
                        var loadedMiles = 0;

                        var index = 1;

                        if (load.StopsCount > 0) {
                            for (var i = 0; i < (load.StopsCount - 1); i++) {
                                loadedMiles += parseFloat(legs[index].LegMiles);
                                index += 1;
                            }
                        }
                        sails.models['workorder']
                            .update({
                                Id: load.Id
                            }, {
                                Miles: loadedMiles,
                                RateperMile: (loadedMiles/ load.Amount).toFixed(2)
                            })
                            .exec(function callback(error, result) {
                                result.Miles = {
                                                    Miles: loadedMiles,
                                                    RateperMile: (loadedMiles/ load.Amount).toFixed(2)
                                                };
                                cb(null, result);
                            });

                        var taxSummary = results.RunTripResult.Results.TaxSummary;                  
                        saveMiles(taxSummary, null, load.Id, IsRelay, addressstr, function (err, saved) {});
                    }
                })
            });
        }
        });
    };

    var AddressList = function (dOrder, cb) {

        var dOZips = [],
            result = {};
        
        var WayPtsModel = sails.models['waypoints'];
        var query = "CALL getWayPointsByDOIdRelayId(" + dOrder.Id + ",0)";
        
        WayPtsModel.query(query, function (err, wayPoints) {
            if (err) {
                cb(err.message);
            } else {
                wayPoints = wayPoints[0];
                if (wayPoints.length > 0) { 
                        var oLIModel = sails.models['equipmentstop'];
                        var query = "CALL getEquipmentStopsByDOId(" +
                            dOrder.Id + ",null)";
                        oLIModel.query(query, function (err, epResult) {
                            if (err) {
                                cb(err.message);
                            } else {
                                var equipmentStops = epResult[0];

                                var sameStart = true,
                                    sameEnd = true,
                                    stopsCnt = 0,
                                    priorEqStopsCt = 0,
                                    laterEqStopsCt = 0;

                                if (dOrder.StartZip && dOrder.StartZip != wayPoints[0].Zip) {
                                    dOZips.push(dOrder.StartZip)
                                    sameStart = false;
                                }

                                for (var i = 0; i < equipmentStops.length; i++) {
                                    if (equipmentStops[i].IsPriorStops === 1)
                                    {
                                        if (dOZips[dOZips.length - 1] != equipmentStops[i].Zip) {
                                            dOZips.push(equipmentStops[i].Zip);
                                            priorEqStopsCt += 1;
                                        }
                                    }
                                }

                                for (var i = 0; i < wayPoints.length; i++) {
                                    if (i === 0) {
                                        dOZips.push(wayPoints[i].Zip);
                                        stopsCnt += 1;
                                    }
                                    else {
                                        if (wayPoints[i].Zip != wayPoints[i-1].Zip) {
                                            dOZips.push(wayPoints[i].Zip);
                                            stopsCnt += 1;
                                        }
                                    }
                                }

                                for (var i = 0; i < equipmentStops.length; i++) {
                                    if (equipmentStops[i].IsPriorStops === 0)
                                    {
                                        if (dOZips[dOZips.length - 1] != equipmentStops[i].Zip) {
                                            dOZips.push(equipmentStops[i].Zip);
                                            laterEqStopsCt += 1;
                                        }
                                    }
                                }

                                if (dOrder.EndZip && dOrder.EndZip != wayPoints[wayPoints.length - 1].Zip) {
                                    dOZips.push(dOrder.EndZip);
                                    sameEnd = false;
                                }

                                result.DOrder = dOrder;
                                result.DOrder.Zips = dOZips;
                                result.DOrder.SameStart = sameStart;
                                result.DOrder.SameEnd = sameEnd;
                                result.DOrder.StopsCount = stopsCnt;
                                result.DOrder.PriorEqStopsCt = priorEqStopsCt;
                                result.DOrder.LaterEqStopsCt = laterEqStopsCt;

                                result.Relays = [];
                                if (dOrder.Relays > 0) {

                                    var relayModel = sails.models['relay'];
                                    var query = "select r.Id, sa.Zip as StartZip, ea.Zip as EndZip,r.Carrier_Id from relay r LEFT JOIN address sa on sa.Id = r.StartingLoc_Id LEFT JOIN address ea on ea.Id = r.EndingLoc_Id where r.IsDeleted = 0 and r.DispatchOrder_Id =" + dOrder.Id;

                                    relayModel.query(query, function (err, relays) {
                                        if (err) {
                                            cb(err);
                                        } else {
                    //                        relays = relays[0];
            //console.log('relays...',relays);
                                            async.forEach(Object.keys(relays), function (i, callb) {
                                                var relayZips = [], sameRelayStart = true, sameRelayEnd = true, stopsRelayCnt = 0;
                                                var relayStopsModel = sails.models['dostops'];
                                                var query = "CALL getWayPointsByDOIdRelayId(" + dOrder.Id + "," + relays[i].Id+ ")";
                                                
                                                relayStopsModel.query(query, function (err, relayStopsZip) {
                                                    if(!err) {
                                                        relayStopsZip = relayStopsZip[0];
                                                        
                                                        if (relays[i].StartZip && relays[i].StartZip != relayStopsZip[0].Zip) {
                                                            relayZips.push(relays[i].StartZip);
                                                            sameRelayStart = false;
                                                        }

                                                        for (var j = 0; j < relayStopsZip.length; j++) {
                                                            if (j === 0) {
                                                                relayZips.push(relayStopsZip[j].Zip);
                                                                stopsRelayCnt += 1;
                                                            }
                                                            else {
                                                                if (relayStopsZip[j].Zip != relayStopsZip[j-1].Zip) {
                                                                    relayZips.push(relayStopsZip[j].Zip);
                                                                    stopsRelayCnt += 1;
                                                                }
                                                            }
                                                        }

                                                        if (relays[i].EndZip && relays[i].EndZip != relayStopsZip[relayStopsZip.length - 1].Zip) {
                                                            relayZips.push(relays[i].EndZip);
                                                            sameRelayEnd = false;
                                                        }

                                                        relays[i].Zips = relayZips;
                                                        relays[i].SameStart = sameRelayStart;
                                                        relays[i].SameEnd = sameRelayEnd;
                                                        relays[i].StopsCount = relayStopsZip.length;
                                                        callb();
                                                    } else 
                                                        callb(err);
                                                });

                                            }, function (err) {
                                                result.Relays = relays;
                                                cb(err, result);
                                            });
                                        }
                                    })
                                } else {
                                    cb(err, result);
                                }
                            }
                        });
//                    });
                } else {
                    var stopsModel = sails.models['wostops'];
                    var query = "CALL getStopsZipByDOId(" + dOrder.Id + ")";

                    stopsModel.query(query, function (err, stopsZip) {
                        var oLIModel = sails.models['equipmentstop'];
                        var query = "CALL getEquipmentStopsByDOId(" +
                            dOrder.Id + ",null)";
                        oLIModel.query(query, function (err, epResult) {
                            if (err) {
                                cb(err.message);
                            } else {
                                var equipmentStops = epResult[0];

                                stopsZip = stopsZip[0];

                                var sameStart = true,
                                    sameEnd = true,
                                    stopsCnt = 0,
                                    priorEqStopsCt = 0,
                                    laterEqStopsCt = 0;

                                if (dOrder.StartZip && dOrder.StartZip != stopsZip[0].Zip) {
                                    dOZips.push(dOrder.StartZip)
                                    sameStart = false;
                                }

                                for (var i = 0; i < equipmentStops.length; i++) {
                                    if (equipmentStops[i].IsPriorStops === 1)
                                    {
                                        if (dOZips[dOZips.length - 1] != equipmentStops[i].Zip) {
                                            dOZips.push(equipmentStops[i].Zip);
                                            priorEqStopsCt += 1;
                                        }
                                    }
                                }

                                for (var i = 0; i < stopsZip.length; i++) {
                                    if (i === 0) {
                                        dOZips.push(stopsZip[i].Zip);
                                        stopsCnt += 1;
                                    }
                                    else {
                                        if (stopsZip[i].Zip != stopsZip[i-1].Zip) {
                                            dOZips.push(stopsZip[i].Zip);
                                            stopsCnt += 1;
                                        }
                                    }
                                }

                                for (var i = 0; i < equipmentStops.length; i++) {
                                    if (equipmentStops[i].IsPriorStops === 0)
                                    {
                                        if (dOZips[dOZips.length - 1] != equipmentStops[i].Zip) {
                                            dOZips.push(equipmentStops[i].Zip);
                                            laterEqStopsCt += 1;
                                        }
                                    }
                                }

                                if (dOrder.EndZip && dOrder.EndZip != stopsZip[stopsZip.length - 1].Zip) {
                                    dOZips.push(dOrder.EndZip);
                                    sameEnd = false;
                                }

                                result.DOrder = dOrder;
                                result.DOrder.Zips = dOZips;
                                result.DOrder.SameStart = sameStart;
                                result.DOrder.SameEnd = sameEnd;
                                result.DOrder.StopsCount = stopsCnt;
                                result.DOrder.PriorEqStopsCt = priorEqStopsCt;
                                result.DOrder.LaterEqStopsCt = laterEqStopsCt;

                                result.Relays = [];
                                if (dOrder.Relays > 0) {

                                    var relayModel = sails.models['relay'];
                                    var query = "select r.Id, sa.Zip as StartZip, ea.Zip as EndZip from relay r LEFT JOIN address sa on sa.Id = r.StartingLoc_Id LEFT JOIN address ea on ea.Id = r.EndingLoc_Id where r.IsDeleted = 0 and r.DispatchOrder_Id =" + dOrder.Id;

                                    relayModel.query(query, function (err, relays) {
                                        if (err) {
                                            cb(err);
                                        } else {
                    //                        relays = relays[0];
            //console.log('relays...',relays);
                                            async.forEach(Object.keys(relays), function (i, callb) {
                                                var relayZips = [], sameRelayStart = true, sameRelayEnd = true, stopsRelayCnt = 0;;
                                                var relayStopsModel = sails.models['dostops'];
                                                var query = "CALL getRelayStopsZipByRelayId(" + relays[i].Id + ")";

                                                relayStopsModel.query(query, function (err, relayStopsZip) {
                                                    relayStopsZip = relayStopsZip[0];

                                                    if (relays[i].StartZip && relays[i].StartZip != relayStopsZip[0].Zip) {
                                                        relayZips.push(relays[i].StartZip);
                                                        sameRelayStart = false;
                                                    }

                                                    for (var j = 0; j < relayStopsZip.length; j++) {
                                                         if (j === 0) {
                                                            relayZips.push(relayStopsZip[j].Zip);
                                                             stopsRelayCnt += 1;
                                                         }
                                                        else {
                                                            if (relayStopsZip[j].Zip != relayStopsZip[j-1].Zip) {
                                                                relayZips.push(relayStopsZip[j].Zip);
                                                                stopsRelayCnt += 1;
                                                            }
                                                        }
                                                    }

                                                    if (relays[i].EndZip && relays[i].EndZip != relayStopsZip[relayStopsZip.length - 1].Zip) {
                                                        relayZips.push(relays[i].EndZip);
                                                        sameRelayEnd = false;
                                                    }

                                                    relays[i].Zips = relayZips;
                                                    relays[i].SameStart = sameRelayStart;
                                                    relays[i].SameEnd = sameRelayEnd;
                                                    relays[i].StopsCount = relayStopsZip.length;
                                                    callb();
                                                });

                                            }, function (err) {
                                                result.Relays = relays;
                                                cb(err, result);
                                            });
                                        }
                                    })
                                } else {
                                    cb(err, result);
                                }
                            }
                        });
                    });
                }
            }
        });
    };
    
    var updatelineitems = function (id, miles, isRelay, callb) {
        try {
            if (isRelay === 0) {
                var queryd = "SELECT dl.*, do.Driver1_Id, do.Driver2_Id, do.Driver1Rate, do.Driver2Rate, c.SplitDriverMiles,d.Name DescriptionName, d1.EmptyMilesRate D1EmptyRate, d2.EmptyMilesRate D2EmptyRate,d1.LoadedMilesRate D1LoadedRate, d2.LoadedMilesRate D2LoadedRate, do.Driver1Settlement_Id, do.Driver2Settlement_Id FROM dispatchorder do LEFT JOIN driverlineitems dl ON dl.DispatchOrder_Id = do.Id and dl.Relay_Id IS NULL LEFT JOIN description d ON d.Id = dl.Description_Id LEFT JOIN company c ON c.Id = do.Company_Id LEFT JOIN driver d1 on d1.Id = do.Driver1_Id LEFT JOIN driver d2 on d2.Id = do.Driver2_Id WHERE do.Id =" + id + ";";
                var dModel = sails.models['driver'];
                dModel.query(queryd, function (err, lineitems) {
    //                console.log('lineitems',lineitems);
    //                lineitems = lineitems[0];

                    if (lineitems.length > 0 && !lineitems[0].Driver1Settlement_Id) {
                        // console.log('inside if...');
                        var driver1LIItems = _.find(lineitems, function(item) { 
                                            return item.DescriptionName == 'Flat Amount' && item.Driver1_Id == item.Driver_Id;
                                        });
                        
    //                    console.log('driver1LIItems.....',driver1LIItems);
                        
                    
                        
                        if (driver1LIItems === undefined) {
                        
                            var driver1LI = _.find(lineitems, function(item) { 
                                                return item.Driver_Id == item.Driver1_Id && (item.DescriptionName == 'Per Mile Amount' || item.DescriptionName == 'Loaded Miles Amount' );
                                            });
                            
                            // console.log('driver1LI...',driver1LI);
                            var updateDO = {};

                            if (driver1LI != undefined) {
                                // console.log('inside te if....');
                                var emptyMiles = 0;
                                
                                if (lineitems[0].D1EmptyRate > 0) {
                                    updateDO.Quantity = (miles.Loadedmiles).toFixed(2);
                                    emptyMiles = ( miles.DeadheadedAfter + miles.DeadheadedBefore).toFixed(2);
                                }
                                else                                
                                    updateDO.Quantity = (miles.Loadedmiles + miles.DeadheadedAfter + miles.DeadheadedBefore).toFixed(2);
                                

                                if (driver1LI.Driver2_Id && driver1LI.SplitDriverMiles) {
                                    updateDO.Quantity = (updateDO.Quantity / 2).toFixed(2);
                                    emptyMiles = (emptyMiles /2 ).toFixed(2);
                                }

                                updateDO.RatePer = driver1LI.Driver1Rate;
                                updateDO.Amount = (updateDO.Quantity * driver1LI.Driver1Rate).toFixed(2);

                                if(driver1LI.D1LoadedRate > 0) {
                                    updateDO.RatePer = driver1LI.D1LoadedRate;
                                    updateDO.Amount = (updateDO.Quantity * driver1LI.D1LoadedRate).toFixed(2);
                                }

                                sails.models['driverlineitems']
                                .update({
                                    Id: driver1LI.Id
                                }, updateDO)
                                .exec(function (err, updateResponse) {
    //                            console.log('err',err);
    //                            console.log('updateResponse',updateResponse);
    //                                callb();
                                });
                                
                                if(lineitems[0].D1EmptyRate > 0) {
                                
                                    var driver1LIEmpty = _.find(lineitems, function(item) { 
                                                    return item.Driver_Id == item.Driver1_Id && item.DescriptionName == 'Empty Miles Amount';
                                                });
                                    if (driver1LIEmpty != undefined) {
                                        var emptymilesUpdate = {};

                                        emptymilesUpdate.Quantity = emptyMiles;
                                        emptymilesUpdate.RatePer = lineitems[0].D1EmptyRate;
                                        emptymilesUpdate.Amount = (emptyMiles * lineitems[0].D1EmptyRate).toFixed(2);

                                        sails.models['driverlineitems']
                                        .update({
                                            Id: driver1LIEmpty.Id
                                        }, emptymilesUpdate)
                                        .exec(function (err, updateResponse) {
            //                            console.log('err',err);
            //                            console.log('updateResponse',updateResponse);
            //                                callb();
                                        });
                                    } else {
                                        var insertString = "INSERT INTO driverlineitems(Driver_Id,Description_Id,Quantity,RatePer,Amount,DispatchOrder_Id,Relay_Id)VALUES"; 
                                        
                                        insertString += "(" + lineitems[0].Driver1_Id + ",(select Id from description where name = 'Empty Miles Amount')," + emptyMiles + "," + lineitems[0].D1EmptyRate + "," + (emptyMiles * lineitems[0].D1EmptyRate).toFixed(2) + "," + id + ",null)";
                                        
                                        insertString += ';\n';
            //                            console.log('insertString...', insertString);
                                        var dModel = sails.models['driverlineitems'];
                                        dModel.query(insertString, function (err, lineitems) {
            //                                console.log('err in dr lineitems...', err);
                                        }); 
                                    }
                                }
                                
                            } else {
                                var insertString = "INSERT INTO driverlineitems(Driver_Id,Description_Id,Quantity,RatePer,Amount,DispatchOrder_Id,Relay_Id)VALUES"; 
                                var quantity = 0;
                                var emptyMiles = 0;
                                
                                if (lineitems[0].D1EmptyRate > 0) {
                                    quantity = (miles.Loadedmiles).toFixed(2);
                                    emptyMiles = ( miles.DeadheadedAfter + miles.DeadheadedBefore).toFixed(2);
                                }
                                else
                                    quantity = (miles.Loadedmiles + miles.DeadheadedAfter + miles.DeadheadedBefore).toFixed(2);

                                if (lineitems[0].Driver2_Id && lineitems[0].SplitDriverMiles) {
                                    quantity = (quantity / 2).toFixed(2);
                                    emptyMiles = (emptyMiles /2).toFixed(2);
                                }

                                var ratePer = lineitems[0].Driver1Rate;
                                var amount = (quantity * lineitems[0].Driver1Rate).toFixed(2);

                                if(lineitems[0].D1LoadedRate > 0) {
                                    ratePer = lineitems[0].D1LoadedRate;
                                    amount = (quantity * ratePer).toFixed(2);
                                }

                                insertString += "(" + lineitems[0].Driver1_Id + ","+ (lineitems[0].D1EmptyRate > 0 ? "(select Id from description where name = 'Loaded Miles Amount')" : '6')+"," + quantity + "," + ratePer + "," + amount + "," + id + ",null)";
                                
                                if(lineitems[0].D1EmptyRate > 0) 
                                    insertString += ",(" + lineitems[0].Driver1_Id + ",(select Id from description where name = 'Empty Miles Amount')," + emptyMiles + "," + lineitems[0].D1EmptyRate + "," + (emptyMiles * lineitems[0].D1EmptyRate).toFixed(2) + "," + id + ",null)";
                                
                                insertString += ';\n';
                            //    console.log('insertString...', insertString);
                                var dModel = sails.models['driverlineitems'];
                                dModel.query(insertString, function (err, lineitems) {
                                //    console.log('err in dr lineitems...', err);
                                }); 
                            }
                        }
                    }
                    
                    if (lineitems.length > 0 && !lineitems[0].Driver2Settlement_Id) {
                        var driver2LIItems = _.find(lineitems, function(item) { 
                            return item.DescriptionName == 'Flat Amount' && item.Driver2_Id == item.Driver_Id;
                        });
                        if (driver2LIItems === undefined) {
                        
                            var driver2LI = _.find(lineitems, function(item) { 
                                            return item.Driver_Id == item.Driver2_Id && (item.DescriptionName == 'Per Mile Amount' || item.DescriptionName == 'Loaded Miles Amount' );
                                        });
    //                    async.forEach(Object.keys(lineitems), function (i, cb) {

                            
                            if (driver2LI != undefined) {
                                var updateDO2 = {};
                                
                                var emptyMiles = 0;
                                
                                if (lineitems[0].D2EmptyRate > 0) {
                                    updateDO2.Quantity = (miles.Loadedmiles).toFixed(2);
                                    emptyMiles = ( miles.DeadheadedAfter + miles.DeadheadedBefore).toFixed(2);
                                }
                                else                                
                                    updateDO2.Quantity = (miles.Loadedmiles + miles.DeadheadedAfter + miles.DeadheadedBefore).toFixed(2);
                                

                                if (driver2LI.Driver2_Id && driver2LI.SplitDriverMiles) {
                                    updateDO2.Quantity = (updateDO2.Quantity / 2).toFixed(2);
                                    emptyMiles = (emptyMiles /2 ).toFixed(2);
                                }
                                
                                updateDO2.RatePer = driver2LI.Driver2Rate;
                                updateDO2.Amount = (updateDO2.Quantity * driver2LI.Driver2Rate).toFixed(2);
                                
                                if(driver2LI.D2LoadedRate > 0) {
                                    updateDO2.RatePer = driver2LI.D2LoadedRate;
                                    updateDO2.Amount = (updateDO2.Quantity * driver2LI.D2LoadedRate).toFixed(2);
                                }

                                sails.models['driverlineitems']
                                .update({
                                    Id: driver2LI.Id
                                }, updateDO2)
                                .exec(function (err, updateResponse) {
                                });
                                if(lineitems[0].D2EmptyRate > 0) {
                                
                                    var driver2LIEmpty = _.find(lineitems, function(item) { 
                                                    return item.Driver_Id == item.Driver2_Id && item.DescriptionName == 'Empty Miles Amount';
                                                });
                                    if (driver2LIEmpty != undefined) {
                                        var emptymilesUpdate = {};

                                        emptymilesUpdate.Quantity = emptyMiles;
                                        emptymilesUpdate.RatePer = lineitems[0].D2EmptyRate;
                                        emptymilesUpdate.Amount = (emptyMiles * lineitems[0].D2EmptyRate).toFixed(2);
                                        sails.models['driverlineitems']
                                        .update({
                                            Id: driver2LIEmpty.Id
                                        }, emptymilesUpdate)
                                        .exec(function (err, updateResponse) {
                                        });
                                    } else {
                                        var insertString = "INSERT INTO driverlineitems(Driver_Id,Description_Id,Quantity,RatePer,Amount,DispatchOrder_Id,Relay_Id)VALUES"; 
                                        
                                        insertString += "(" + lineitems[0].Driver2_Id + ",(select Id from description where name = 'Empty Miles Amount')," + emptyMiles + "," + lineitems[0].D2EmptyRate + "," + (emptyMiles * lineitems[0].D2EmptyRate).toFixed(2) + "," + id + ",null)";
                                        
                                        insertString += ';\n';
            //                            console.log('insertString...', insertString);
                                        var dModel = sails.models['driverlineitems'];
                                        dModel.query(insertString, function (err, lineitems) {
            //                                console.log('err in dr lineitems...', err);
                                        }); 
                                    }
                                }
                            } else if (lineitems[0].Driver2_Id) {
                                var insertString = "INSERT INTO driverlineitems(Driver_Id,Description_Id,Quantity,RatePer,Amount,DispatchOrder_Id,Relay_Id)VALUES"; 
                                
                                var quantity = 0;
                                var emptyMiles = 0;
                                
                                if (lineitems[0].D2EmptyRate > 0) {
                                    quantity = (miles.Loadedmiles).toFixed(2);
                                    emptyMiles = ( miles.DeadheadedAfter + miles.DeadheadedBefore).toFixed(2);
                                }
                                else
                                    quantity = (miles.Loadedmiles + miles.DeadheadedAfter + miles.DeadheadedBefore).toFixed(2);

                                if (lineitems[0].Driver2_Id && lineitems[0].SplitDriverMiles) {
                                    quantity = (quantity / 2).toFixed(2);
                                    emptyMiles = (emptyMiles /2).toFixed(2);
                                }

                                var ratePer = lineitems[0].Driver2Rate;
                                var amount = (quantity * lineitems[0].Driver2Rate).toFixed(2);

                                if(lineitems[0].D2LoadedRate > 0) {
                                    ratePer = lineitems[0].D2LoadedRate;
                                    amount = (quantity * ratePer).toFixed(2);
                                }

                                insertString += "(" + lineitems[0].Driver2_Id + ","+ (lineitems[0].D2EmptyRate > 0 ? "(select Id from description where name = 'Loaded Miles Amount')" : '6')+"," + quantity + "," + ratePer + "," + amount + "," + id + ",null)";
                                if(lineitems[0].D2EmptyRate > 0) 
                                    insertString += ",(" + lineitems[0].Driver2_Id + ",(select Id from description where name = 'Empty Miles Amount')," + emptyMiles + "," + lineitems[0].D2EmptyRate + "," + (emptyMiles * lineitems[0].D2EmptyRate).toFixed(2) + "," + id + ",null)";
                                
                                insertString += ';\n';
                                var dModel = sails.models['driverlineitems'];
                                dModel.query(insertString, function (err, lineitems) {
                                }); 
                            }
                        }
                        callb();
                        } else {//console.log('inside else...');
                            callb();
                        }
                })
    //                }
    //            });            
            } else {
                var queryd = "SELECT dl.*, do.Driver1_Id, do.Driver2_Id, do.Driver1Rate, do.Driver2Rate, c.SplitDriverMiles, dor.Id DOId, d.Name DescriptionName, d1.EmptyMilesRate D1EmptyRate, d2.EmptyMilesRate D2EmptyRate,d1.LoadedMilesRate D1LoadedRate, d2.LoadedMilesRate D2LoadedRate,do.Driver1Settlement_Id, do.Driver2Settlement_Id FROM relay do LEFT JOIN driverlineitems dl ON dl.Relay_Id = do.Id LEFT JOIN description d ON d.Id = dl.Description_Id LEFT JOIN dispatchorder dor ON dor.Id = do.Dispatchorder_Id LEFT JOIN company c ON c.Id = dor.Company_Id LEFT JOIN driver d1 on d1.Id = do.Driver1_Id LEFT JOIN driver d2 on d2.Id = do.Driver2_Id WHERE do.Id = " + id + ";";
                var dModel = sails.models['driver'];
                dModel.query(queryd, function (err, lineitems) {
    //                 console.log('lineitems',lineitems);
    //                lineitems = lineitems[0];
                    if (lineitems.length > 0 && !lineitems[0].Driver1Settlement_Id) {
                        // console.log('inside if...');

                        var driver1LIItems = _.find(lineitems, function(item) { 
                                            return item.DescriptionName == 'Flat Amount' && item.Driver1_Id == item.Driver_Id;
                                        });
                        
                        var driver2LIItems = _.find(lineitems, function(item) { 
                                            return item.DescriptionName == 'Flat Amount' && item.Driver2_Id == item.Driver_Id;
                                        });
                        
                        if (driver1LIItems === undefined) {
                            var driver1LI = _.find(lineitems, function(item) { 
                                            return item.Driver_Id == item.Driver1_Id && (item.DescriptionName == 'Per Mile Amount' || item.DescriptionName == 'Loaded Miles Amount' );
                                        });
                        
                            var updateDO = {};
                        
                            if (driver1LI != undefined) {
                                
                                var emptyMiles = 0;
                                
                                if (lineitems[0].D1EmptyRate > 0) {
                                    updateDO.Quantity = (miles.Loadedmiles).toFixed(2);
                                    emptyMiles = ( miles.DeadheadedAfter + miles.DeadheadedBefore).toFixed(2);
                                }
                                else                                
                                    updateDO.Quantity = (miles.Loadedmiles + miles.DeadheadedAfter + miles.DeadheadedBefore).toFixed(2);
                                
                                if (driver1LI.Driver2_Id && driver1LI.SplitDriverMiles) {
                                    updateDO.Quantity = (updateDO.Quantity / 2).toFixed(2);
                                    emptyMiles = (emptyMiles /2 ).toFixed(2);
                                }
                                
                                updateDO.RatePer = driver1LI.Driver1Rate;
                                updateDO.Amount = (updateDO.Quantity * driver1LI.Driver1Rate).toFixed(2);
                                
                                if(driver1LI.D1LoadedRate > 0) {
                                    updateDO.RatePer = driver1LI.D1LoadedRate;
                                    updateDO.Amount = (updateDO.Quantity * driver1LI.D1LoadedRate).toFixed(2);
                                }

                                sails.models['driverlineitems']
                                .update({
                                    Id: driver1LI.Id
                                }, updateDO)
                                .exec(function (err, updateResponse) {
                                }); 
                                if(lineitems[0].D1EmptyRate > 0) {
                                
                                    var driver1LIEmpty = _.find(lineitems, function(item) { 
                                                    return item.Driver_Id == item.Driver1_Id && item.DescriptionName == 'Empty Miles Amount';
                                                });
                                    if (driver1LIEmpty != undefined) {
                                        var emptymilesUpdate = {};

                                        emptymilesUpdate.Quantity = emptyMiles;
                                        emptymilesUpdate.RatePer = lineitems[0].D1EmptyRate;
                                        emptymilesUpdate.Amount = (emptyMiles * lineitems[0].D1EmptyRate).toFixed(2);

                                        sails.models['driverlineitems']
                                        .update({
                                            Id: driver1LIEmpty.Id
                                        }, emptymilesUpdate)
                                        .exec(function (err, updateResponse) {
                                        });
                                    } else {
                                        var insertString = "INSERT INTO driverlineitems(Driver_Id,Description_Id,Quantity,RatePer,Amount,DispatchOrder_Id,Relay_Id)VALUES"; 
                                        
                                        insertString += "(" + lineitems[0].Driver1_Id + ",(select Id from description where name = 'Empty Miles Amount')," + emptyMiles + "," + lineitems[0].D1EmptyRate + "," + (emptyMiles * lineitems[0].D1EmptyRate).toFixed(2) + "," + lineitems[0].DOId + ","+ id+")";
                                        
                                        insertString += ';\n';
                                        var dModel = sails.models['driverlineitems'];
                                        dModel.query(insertString, function (err, lineitems) {
                                        }); 
                                    }
                                }

                            } else {
                                var insertString = "INSERT INTO driverlineitems(Driver_Id,Description_Id,Quantity,RatePer,Amount,DispatchOrder_Id,Relay_Id)VALUES"; 
                                
                                var quantity = 0;
                                var emptyMiles = 0;
                                
                                if (lineitems[0].D1EmptyRate > 0) {
                                    quantity = (miles.Loadedmiles).toFixed(2);
                                    emptyMiles = ( miles.DeadheadedAfter + miles.DeadheadedBefore).toFixed(2);
                                }
                                else
                                    quantity = (miles.Loadedmiles + miles.DeadheadedAfter + miles.DeadheadedBefore).toFixed(2);

                                if (lineitems[0].Driver2_Id && lineitems[0].SplitDriverMiles) {
                                    quantity = (quantity / 2).toFixed(2);
                                    emptyMiles = (emptyMiles /2).toFixed(2);
                                }

                                var ratePer = lineitems[0].Driver1Rate;
                                var amount = (quantity * lineitems[0].Driver1Rate).toFixed(2);
                                
                                if(lineitems[0].D1LoadedRate > 0) {
                                    ratePer = lineitems[0].D1LoadedRate;
                                    amount = (quantity * ratePer).toFixed(2);
                                }
                                
                                insertString += "(" + lineitems[0].Driver1_Id + ","+ (lineitems[0].D1EmptyRate > 0 ? "(select Id from description where name = 'Loaded Miles Amount')" : '6')+"," + quantity + "," + ratePer + "," + amount + "," + lineitems[0].DOId + ","+ id+")";
                                
                                if(lineitems[0].D1EmptyRate > 0) 
                                    insertString += ",(" + lineitems[0].Driver1_Id + ",(select Id from description where name = 'Empty Miles Amount')," + emptyMiles + "," + lineitems[0].D1EmptyRate + "," + (emptyMiles * lineitems[0].D1EmptyRate).toFixed(2) + "," + lineitems[0].DOId + ","+ id+ ")";
                                
                                insertString += ';\n';
    //                            console.log('insertString...', insertString);
                                var dModel = sails.models['driverlineitems'];
                                dModel.query(insertString, function (err, lineitems) {
    //                                console.log('err in dr lineitems...', err);
                                }); 
                            }
                        }
                    }
                    
                    if (lineitems.length > 0 && !lineitems[0].Driver2Settlement_Id) {
                        var driver2LIItems = _.find(lineitems, function(item) { 
                            return item.DescriptionName == 'Flat Amount' && item.Driver2_Id == item.Driver_Id;
                        });

                    
                        if (driver2LIItems === undefined) {
                            var driver2LI = _.find(lineitems, function(item) { 
                                            return item.Driver_Id == item.Driver2_Id && (item.DescriptionName == 'Per Mile Amount' || item.DescriptionName == 'Loaded Miles Amount' );
                                        });
                        
                            if (driver2LI != undefined) {
                            var updateDO2 = {};
                                
                                
                                var emptyMiles = 0;
                                
                                if (lineitems[0].D2EmptyRate > 0) {
                                    updateDO2.Quantity = (miles.Loadedmiles).toFixed(2);
                                    emptyMiles = ( miles.DeadheadedAfter + miles.DeadheadedBefore).toFixed(2);
                                }
                                else                                
                                    updateDO2.Quantity = (miles.Loadedmiles + miles.DeadheadedAfter + miles.DeadheadedBefore).toFixed(2);
                                
                                if (driver2LI.Driver2_Id && driver2LI.SplitDriverMiles) {
                                    updateDO2.Quantity = (updateDO2.Quantity / 2).toFixed(2);
                                    emptyMiles = (emptyMiles /2 ).toFixed(2);
                                }
                                
                                updateDO2.RatePer = driver2LI.Driver2Rate;
                                updateDO2.Amount = (updateDO2.Quantity * driver2LI.Driver2Rate).toFixed(2);
                                
                                if(driver2LI.D2LoadedRate > 0) {
                                    updateDO.RatePer = driver2LI.D2LoadedRate;
                                    updateDO.Amount = (updateDO.Quantity * driver2LI.D2LoadedRate).toFixed(2);
                                }

                                sails.models['driverlineitems']
                                .update({
                                    Id: driver2LI.Id
                                }, updateDO2)
                                .exec(function (err, updateResponse) {
                                });
                                
                                                        
                                if(lineitems[0].D2EmptyRate > 0) {
                                
                                    var driver2LIEmpty = _.find(lineitems, function(item) { 
                                                    return item.Driver_Id == item.Driver2_Id && item.DescriptionName == 'Empty Miles Amount';
                                                });
                                    if (driver2LIEmpty != undefined) {
                                        var emptymilesUpdate = {};

                                        emptymilesUpdate.Quantity = emptyMiles;
                                        emptymilesUpdate.RatePer = lineitems[0].D2EmptyRate;
                                        emptymilesUpdate.Amount = (emptyMiles * lineitems[0].D2EmptyRate).toFixed(2);

                                        sails.models['driverlineitems']
                                        .update({
                                            Id: driver2LIEmpty.Id
                                        }, emptymilesUpdate)
                                        .exec(function (err, updateResponse) {
                                        });
                                    } else {
                                        var insertString = "INSERT INTO driverlineitems(Driver_Id,Description_Id,Quantity,RatePer,Amount,DispatchOrder_Id,Relay_Id)VALUES"; 
                                        
                                        insertString += "(" + lineitems[0].Driver2_Id + ",(select Id from description where name = 'Empty Miles Amount')," + emptyMiles + "," + lineitems[0].D2EmptyRate + "," + (emptyMiles * lineitems[0].D2EmptyRate).toFixed(2)+ "," + lineitems[0].DOId + ","+ id+")";
                                        
                                        insertString += ';\n';
                                        var dModel = sails.models['driverlineitems'];
                                        dModel.query(insertString, function (err, lineitems) {
                                        }); 
                                    }
                                }
                            } else if (lineitems[0].Driver2_Id) {
                                var insertString = "INSERT INTO driverlineitems(Driver_Id,Description_Id,Quantity,RatePer,Amount,DispatchOrder_Id,Relay_Id)VALUES"; 
                                
                                var quantity = 0;
                                var emptyMiles = 0;
                                
                                if (lineitems[0].D2EmptyRate > 0) {
                                    quantity = (miles.Loadedmiles).toFixed(2);
                                    emptyMiles = ( miles.DeadheadedAfter + miles.DeadheadedBefore).toFixed(2);
                                }
                                else
                                    quantity = (miles.Loadedmiles + miles.DeadheadedAfter + miles.DeadheadedBefore).toFixed(2);

                                if (lineitems[0].Driver2_Id && lineitems[0].SplitDriverMiles) {
                                    quantity = (quantity / 2).toFixed(2);
                                    emptyMiles = (emptyMiles /2).toFixed(2);
                                }
                                
                                var ratePer = lineitems[0].Driver2Rate;
                                var amount = (quantity * lineitems[0].Driver2Rate).toFixed(2);
                                
                                if(lineitems[0].D2LoadedRate > 0) {
                                    ratePer = lineitems[0].D2LoadedRate;
                                    amount = (quantity * ratePer).toFixed(2);
                                }

                                insertString += "(" + lineitems[0].Driver2_Id + ","+ (lineitems[0].D2EmptyRate > 0 ? "(select Id from description where name = 'Loaded Miles Amount')" : '6')+"," + quantity + "," + ratePer + "," + amount +"," + lineitems[0].DOId + ","+ id+")";
                                
                                if(lineitems[0].D2EmptyRate > 0) 
                                    insertString += ",(" + lineitems[0].Driver2_Id + ",(select Id from description where name = 'Empty Miles Amount')," + emptyMiles + "," + lineitems[0].D2EmptyRate + "," + (emptyMiles * lineitems[0].D2EmptyRate).toFixed(2) + "," + lineitems[0].DOId + ","+ id+ ")";
                                
                                insertString += ';\n';
                                var dModel = sails.models['driverlineitems'];
                                dModel.query(insertString, function (err, lineitems) {
                                }); 
                            }
                        }
                            callb();
                    } else {
                        callb();
                    }
                });
            }
        } catch (e) {
            callb(e);
        }
    };
    
    var insertlineitems = function (id, miles, isRelay, callb) {
        if (isRelay === 0) {
            var queryd = "select d.Id, d.RatePerMile, d2.Id Driver2Id, d2.RatePerMile Driver2Rate, c.SplitDriverMiles from dispatchorder do left join driver d on d.Id = do.Driver1_Id left join driver d2 on d2.Id = do.Driver2_Id left join company c on c.Id = do.Company_Id where do.Id =" + id + ";";
            var dModel = sails.models['driver'];
            dModel.query(queryd, function (err, driver) {
                driver = driver[0];
                var insertString = "INSERT INTO driverlineitems(Driver_Id,Description_Id,Quantity,RatePer,Amount,DispatchOrder_Id,Relay_Id)VALUES";
                var quantity = (miles.Loadedmiles + miles.DeadheadedAfter + miles.DeadheadedBefore).toFixed(2);
                
                if (driver.Driver2Id > 0 && driver.SplitDriverMiles)
                    quantity = quantity / 2;
                
                if (driver.Id > 0) {   
                    var amount = (quantity * driver.RatePerMile).toFixed(2);

                   insertString += "(" + driver.Id + ",6," + quantity + "," + driver.RatePerMile + "," + amount + "," + id + ",null)";
                }
                
                if (driver.Driver2Id > 0) {
                    var amount1 = (quantity * driver.Driver2Rate).toFixed(2);

                   insertString += ",(" + driver.Driver2Id + ",6," + quantity + "," + driver.Driver2Rate + "," + amount1 + "," + id + ",null)";
                }
                
                insertString += ';\n';
                var dModel = sails.models['driverlineitems'];
                dModel.query(insertString, function (err, lineitems) {
                }); 
            });
        } else {
            var queryd = "select d.Id, d.RatePerMile, d2.Id Driver2Id, d2.RatePerMile Driver2Rate, c.SplitDriverMiles, dor.Id DOId from relay do left join driver d on d.Id = do.Driver1_Id left join driver d2 on d2.Id = do.Driver2_Id left join dispatchorder dor ON dor.Id = do.Dispatchorder_Id left join company c on c.Id = dor.Company_Id where do.Id =" + id + ";";
            var dModel = sails.models['driver'];
            dModel.query(queryd, function (err, driver) {
                driver = driver[0];
                var insertString = "INSERT INTO driverlineitems(Driver_Id,Description_Id,Quantity,RatePer,Amount,DispatchOrder_Id,Relay_Id)VALUES";
                var quantity = (miles.Loadedmiles + miles.DeadheadedAfter + miles.DeadheadedBefore).toFixed(2);
                
                if (driver.Driver2Id > 0 && driver.SplitDriverMiles)
                    quantity = quantity / 2;
                
                if (driver.Id > 0) {   
                    var amount = (quantity * driver.RatePerMile).toFixed(2);

                   insertString += "(" + driver.Id + ",6," + quantity + "," + driver.RatePerMile + "," + amount + ","+ driver.DOId+","  + id + ")";
                }
                
                if (driver.Driver2Id > 0) {
                    var amount1 = (quantity * driver.Driver2Rate).toFixed(2);

                   insertString += ",(" + driver.Driver2Id + ",6," + quantity + "," + driver.Driver2Rate + "," + amount1 + ","+ driver.DOId+"," + id + ")";
                }
                
                insertString += ';\n';
                var dModel = sails.models['driverlineitems'];
                dModel.query(insertString, function (err, lineitems) {
                });   
            });
        }
    };
    
    var AddressWOList = function (woId, cb) {

        var wOZips = [],
            result = {};

        var stopsModel = sails.models['wostops'];
        var query = "CALL getStopsZipByWOId(" + woId + ")";

        stopsModel.query(query, function (err, stopsZip) {
            stopsZip = stopsZip[0];
            var sameStart = true, sameEnd = true, stopsCnt = 0;
            
            for (var i = 0; i < stopsZip.length; i++) {
                if (i === 0) {
                    wOZips.push(stopsZip[i].Zip);
                    stopsCnt += 1;
                }
                else {
                    if (stopsZip[i].Zip != stopsZip[i-1].Zip) {
                        wOZips.push(stopsZip[i].Zip);
                        stopsCnt += 1;
                    }
                }
            }

            result.WOrder = {};
            result.WOrder.Id = woId;
            result.WOrder.Zips = wOZips;
            result.WOrder.StopsCount = stopsCnt;
            result.WOrder.Amount = stopsZip[0].LoadAmount;
            result.WOrder.Company_Id = stopsZip[0].Company_Id;
            result.WOrder.IFTARouteMethod = stopsZip[0].IFTARouteMethod;

            cb(err, result);
        });
    };
    
    var saveMiles = function (results, woid, id, isRelay, addressstr, cb) {
        var type = '', typeId = 0;
        var directions = {};
        var taxSummary = results.TaxSummary;
        var statetaxes = taxSummary.StateTaxSummary.TaxSummaryRow;
        delete taxSummary.StateTaxSummary;

        //var dis = dispatches[0];
        if (woid) {
            taxSummary.WorkOrder_Id = woid; 
            type = 'WorkOrder';
            typeId = woid;
        } else if (isRelay) {
            taxSummary.Relay_Id = id;
            directions.Relay_Id = id;
            type = 'Relay';
            typeId = id;
        } else {
            taxSummary.DispatchOrder_Id = id;
            directions.DispatchOrder_Id = id;
            type = 'DispatchOrder';
            typeId = id;
        }
        
        var wOModel = sails.models['taxsummary'];
        var query = "CALL deletetaxandstatetaxsummary(" + typeId + ",'" + type + "')";              
        wOModel.query(query, function (err, result) {
            taxSummary.Addresses = addressstr;
    //        var route =JSON.stringify(results.RunTripResult.Results.DrivingDirections.DirectionRow);
    //        var directions = {};
    //        directions.Dispatch_Id = dispatch.Id;
    //        directions.Directions = route;

            var route =JSON.stringify(results.DrivingDirections.DirectionRow);
            directions.Directions = route;
            sails.models['taxsummary']
             .create(taxSummary)
             .exec(function callback(error, createdTaxSummary) {
                sails.models['route']
                .create(directions)
                .exec(function callback(error, createdRoute) {
                    stateTaxSummary(statetaxes, createdTaxSummary.id, function (err, createdstatetaxes) {
                            cb(err, 'Saved Successfully!');
                        });
                });
            }); 
        });

    };
    
    var stateTaxSummary = function (statetaxes, taxSummaryId, cb) { 
    async.forEach(Object.keys(statetaxes), function (i, callb) { 
        var statetax = statetaxes[i];
        statetaxes[i].TaxSummary_Id = taxSummaryId;
        sails.models['statetaxsummary']
         .create(statetaxes[i])
         .exec(function callback(error, createdstatetax) {
            callb();
        });
    }, function (err) {
        cb(null, 'executed succesfully');
    });
}

})();