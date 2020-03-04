'use strict';

/**
 * Policy to check if current user is admin or not.
 *
 * @param   {Request}   request     Request object
 * @param   {Response}  response    Response object
 * @param   {Function}  next        Callback function
 *
 * @returns {*}
 */
module.exports = function isAdmin(request, response, next) {
  sails.log.verbose(__filename + ':' + __line + ' [Policy.isAdmin() called]');
  // Fetch current user by the token
  sails.models['user']
    .findOne(request.token)
    .exec(function exec(error, user) {
      if (error) {
        next(error);
      } else if (!user) {
        error = new Error();

        error.status = 401;
        error.message = 'User not found - Please login.';

        next(error);
      } else if (user.Role_Id === 1 || user.Role_Id === 2 || user.Role_Id === 3 || user.Role_Id === 4 || user.Role_Id === 5 || user.Role_Id === 6 || user.Role_Id === 7 || user.Role_Id === 8 || user.Role_Id === 9 || user.Role_Id === 12 || user.Role_Id === 16 || user.Role_Id === 14 || user.Role_Id === 17 || user.Role_Id === 15) {
        next();
      } else {
        error = new Error();

        error.status = 403;
        error.message = 'Forbidden - You are not administrator user.';

        next(error);
      }
    })
};
