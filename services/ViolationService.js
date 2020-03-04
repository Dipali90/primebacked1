(function() {
    var _ = require('lodash');
    var debug = require('debug')('violationservice');
    var util = require('util');
    var moment = require('moment');
    var async = require('async');

    var VIOLATIONTYPE = Object.freeze({
        MINBREAKTIME: 1,
        MAXDRIVETIME: 2,
        MAXSHIFTTIME: 3,
        CYCLELIMIT: 4,
        LOADFORM: 5,
        DVIRFORM: 6
    });
    

    /**
     * Get a list of violations that apply for a given day, driver and a set of logentries
     * NOTE: check violations that apply only for the given day
     * logEntries contain entries for given day and previous 1 day.
     * @param {string} day day for which to get the list of violations.
     * @param {Object} driver driver object for which to get the list of violations. 
     * @param {Array} logEntries Array of log entries.
     * @returns {Array} list of violations. This does not include VIOLATIONTYPE.LOADFORM and VIOLATIONTYPE.DVIRFORM
     */
    function _getListOfViolations(day, driver, logEntries) {
        var violationsCollection = [];
        /**
         * add violation to the collection only if the logentry is for today
         */
        function addViolation(type, logEntry) {
            if(moment(logEntry.StartTime).format('YYYY-MM-DD') === moment(day).format('YYYY-MM-DD')) {
                violationsCollection.push({
                    ViolationType_Id: type,
                    Driver_Id: driver.Id,
                    ElogDate: logEntry.StartTime
                });
            }
        }

        if(logEntries) {
            var CycleType = driver.CycleType;
            var consecutiveShiftTime = 0, startShiftLogEntry, consecutiveDriveTime = 0, driveTime = 0, dutyTime = 0;
            _.each(logEntries, function(logEntry, index) {
                var stateId = logEntry.ELogstate_Id;
                // Make sure you have a EndTime
                if(!logEntry.EndTime) {
                    logEntry.EndTime =  index === 0 ? moment(new Date()) : logEntry[index - 1].StartTime;
                    logEntry.Seconds =  moment.duration(moment(logEntry.EndTime).diff(moment(logEntry.StartTime))).asSeconds();
                }

                // Check for OFF and SLEEP states
                if(stateId === 4 || stateId === 3) {
                    if(consecutiveShiftTime === 0) {
                        startShiftLogEntry = logEntry;
                    }
                    consecutiveShiftTime += logEntry.Seconds;
                    if(logEntry.Seconds >= CycleType.RestBreak) {
                        consecutiveDriveTime = 0;
                    }
                } else {
                    consecutiveShiftTime = 0;
                    startShiftLogEntry = null;
                    if(stateId === 1) {
                        consecutiveDriveTime += logEntry.Seconds;
                        driveTime += logEntry.Seconds;
                    }
                    if(stateId === 1 || stateId === 2) {
                        dutyTime += logEntry.Seconds;
                    }
                }


                // Check violations
                if(consecutiveDriveTime > CycleType.ConsecutiveDriveLimit) {
                    // 30 min Break violation
                    addViolation(VIOLATIONTYPE.MINBREAKTIME, logEntry);
                }


                if(driveTime > CycleType.DriveLimit) {
                    // 11 hours Drive limit violation
                    addViolation(VIOLATIONTYPE.MAXDRIVETIME, logEntry);
                }

                if(dutyTime > CycleType.ShiftLimit) {
                    // 14 hours Shift limit violation\
                    addViolation(VIOLATIONTYPE.MAXSHIFTTIME, logEntry);
                }

                if(consecutiveShiftTime >= CycleType.ConsecutiveBreakLimit) {
                    return false;
                }
            });
        }
        
        return violationsCollection;
    }
    
    /**
     * get violations if driver signed the load form and DVIR for the given day.
     * 
     * @param {string} day day for which to check
     * @param {Object} driver driver object for which to check
     * @param {Array} violationsCollection Array of new violations
     * @param {Array} existingViolations Array of existing violations
     * @param {Function} cbFn callback function
     */
    function getExtraViolations(day, driver, violationsCollection, existingViolations, cbFn) {
        async.parallel({
            loadform: function (cb) {
                sails.models['loadform'].find({
                    ELogDate: moment(day).add(-1, 'days').format('YYYY-MM-DD')
                })
                .exec(cb);
            },
            dvir: function (cb) {
                sails.models['dvir'].find({
                    Time: moment(day).add(-1, 'days').format('YYYY-MM-DD')
                })
                .exec(cb);
            }
        }, function(err, results) {
            if(!results.loadform || results.loadform.length === 0) {
                violationsCollection.push({
                    ViolationType_Id: VIOLATIONTYPE.LOADFORM,
                    Driver_Id: driver.Id,
                    ElogDate: day
                });
            }
            if(!results.dvir || results.dvir.length === 0) {
                violationsCollection.push({
                    ViolationType_Id: VIOLATIONTYPE.DVIRFORM,
                    Driver_Id: driver.Id,
                    ElogDate: day
                });
            }
            cbFn(err, driver, violationsCollection, existingViolations);
        });
    }

    /**
     * Delete all the violations for a given day and a driver. 
     * NOTE: We do this before we add the new list of violations that were calculated.
     * @param {string} day day for which to delete the violations 
     * @param {Object} driver driver model who's violations for the given date to be deleted.
     * @param {Array} violationsCollection Array of new violations list
     * @param {Array} existingViolations Array of existing violations 
     * @param {Function} cb callback function
     */
    function deleteViolations(day, driver, violationsCollection, existingViolations, cb) {
        sails.models['logviolation']
        .destroy({
            ELogDate: moment(day).format('YYYY-MM-DD'),
            Driver_Id: driver.Id
        })
        .exec(function(err) {
            cb(err, driver, violationsCollection, existingViolations);
        })
    }

    /**
     * Update the newly calculated violations for a given day and a driver.
     * NOTE: Ideally after deleting the existing violations we insert the new violations.
     * @param {string} day day for which to add the violations 
     * @param {Object} driver driver model who's violations for the given date to be added.
     * @param {Array} violationsCollection Array of new violations list
     * @param {Array} existingViolations Array of existing violations 
     * @param {Function} cb callback function
     */
    function updateViolations(day, driver, violationsCollection, existingViolations, cb) {
        async.each(violationsCollection, function(violation, cbEach) {
            var existingViolation = _.find(existingViolations, function(o) { return o.ViolationType === violation.violationType; });
            if(!existingViolation) {
                sails.models['logviolation'].create(violation)
                .exec(function(err, result) {
                    cbEach(err, result);
                });
            } else {
                cbEach();
            }
        }, function(err, results) {
            cb(err, violationsCollection);
        });
    }

    /**
     * Get all the violations for a given day and a driver.
     * 
     * @param {string} day day for which to get violations.
     * @param {Object} driver driver model who's violations for the given date to get.
     * @param {Array} existingViolations Array of existing violations
     * @param {Function} cb callback function
     * @param {Error} err err in getting log entries 
     * @param {any} logEntries log entries list for give day + previous day.
     */
    function _checkViolationsInLogEntries(day, driver, existingViolations, cb, err, logEntries) {
        var violationsCollection = _getListOfViolations(day, driver, logEntries);
        cb(err, driver, violationsCollection, existingViolations);
    }
    
    /**
     * Get the driver model for a given user identifier
     * 
     * @param {integer} userId user identifier
     * @param {Function} cb callback function 
     */
    function getDriver(userId, cb) {
        sails.models['driver'].findOne({User_Id: userId}).populate('CycleType').exec(function(err, driver){
            cb(err, driver);
        });
    }

    /**
     * Get all the existing violations that were already calculated.
     * 
     * @param {string} day day for which to get the existing violations
     * @param {Object} driver driver object for which to get the existing violations given the day.
     * @param {Function} cb callback function
     */
    function getExistingViolations(day, driver, cb) {
        sails.models['logviolation'].find({
            Driver_Id: driver.Id,
            ElogDate:  moment(day).format('YYYY-MM-DD')
        })
        .exec(function(err, existingViolationsResponse) {
            cb(err, driver, existingViolationsResponse);
        });
    }

    /**
     * Get Elog states for a given day and previous 1 day  
     * It also calculates the total time in seconds for each log book entry
     * For the most current/active log book record the time is calculated realtime
     * @param {string} day day for which to get the elog states
     * @param {Object} driver driver object for which to get the elog states
     * @param {Array} existingViolations Array of existing violations
     * @param {Function} cb callback function
     */
    function getElogStates(day, driver, existingViolations, cb) {
        var query = util.format('SELECT *, TIMESTAMPDIFF(SECOND, StartTime, EndTime) as Seconds FROM logbook WHERE Driver_Id = %d AND StartTime >= \'%s\' AND COALESCE(EndTime, CURRENT_TIMESTAMP) <= \'%s\' ORDER BY StartTime DESC',
         driver.Id, moment(day).add(-1, 'days').format('YYYY-MM-DD'),  moment(day).add(1, 'days').format('YYYY-MM-DD'));

        sails.models['logbook'].query(query, _checkViolationsInLogEntries.bind(this, day, driver, existingViolations, cb));
    }

    /**
     * Check if the Drive time has exceeded the log cycle limit.
     *
     * @param {string} day day for which to check the log cycle limit.
     * @param {Object} driver driver object for which to check the log cycle limit.
     * @param {Array} violationsCollection Array of the new calculated violations.
     * @param {Array} existingViolations Array of existing violations.
     * @param {Function} cb callback functions.
     */
    function checkLogCycleHoursLimit(day, driver, violationsCollection, existingViolations, cb) {
        var query = util.format('call getTotalDriveTimeInLogCycle(%d, \'%s\')', driver.Id, day);
        sails.models['logbook'].query(query, function(err, results){
            if(!err && results && results.length > 0 && results[0][0]) {
                if(Number(results[0][0].TotalDriveTime) > Number(driver.CycleType.CycleHours) * 60 * 60) {
                    violationsCollection.push({
                        ViolationType_Id: VIOLATIONTYPE.CYCLELIMIT,
                        Driver_Id: driver.Id,
                        ElogDate: day
                    });
                }
            }
            cb(err, driver, violationsCollection, existingViolations)
        });
    }

    module.exports = {
        checkViolationByDay: function(day, userId, callback) {
            async.waterfall([
                getDriver.bind(this, userId),
                getExistingViolations.bind(this, day),
                getElogStates.bind(this, day),
                getExtraViolations.bind(this, day),
                checkLogCycleHoursLimit.bind(this, day),
                deleteViolations.bind(this, day),
                updateViolations.bind(this, day)
            ], callback);
        },
        VIOLATIONTYPE: VIOLATIONTYPE,
        runScheduledViolationCheck: function(callback) {
            var self = this;
            async.waterfall([
                function getDrivers(cb) {
                    sails.models['driver'].find({
                        CycleType_Id: 1
                    })
                    .exec(function(err, drivers){
                        cb(err, drivers);
                    });
                },
                function checkViolations(drivers, cb) {
                    var violations = [];
                    if(drivers) {
                        async.eachLimit(drivers, 100, function(driver, cbEach){
                            self.checkViolationByDay(new Date(), driver.User, function(err, violationResults) {
                                violations.push({
                                    driverId: driver.Id,
                                    violations: violationResults
                                });
                                cbEach(err, violationResults);
                            });
                        }, function(err, results) {
                            cb(err, violations);
                        });
                    } else {
                        cb(new Error('No drivers found'));
                    }
                }
            ], function(err, results) {
                callback(err, results);
            });
        }
    };
})();