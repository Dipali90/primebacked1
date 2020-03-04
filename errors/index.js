var errors = require('restify-errors');
require('./OverlapLogCycleError')(errors);

module.exports = errors;