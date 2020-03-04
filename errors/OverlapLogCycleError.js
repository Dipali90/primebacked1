module.exports = function(errors) {
    errors.makeConstructor('OverlapLogCycleError', {
        statusCode: 400,
        failureType: 'logbook'
    });
};