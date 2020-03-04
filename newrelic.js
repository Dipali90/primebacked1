/**
 * New Relic agent configuration.
 *
 * See lib/config.defaults.js in the agent distribution for a more complete
 * description of configuration variables and their potential values.
 */
exports.config = {
  /**
   * Array of application names.
   */
  app_name: ['etruckbackend-' + (process.env.NODE_ENV || 'development')],
  /**
   * Your New Relic license key.
   */
  license_key: 'fbd2bcd7da89b16a03338744ada42a91ae10c236',
  logging: {
    /**
     * Level at which to log. 'trace' is most useful to New Relic when diagnosing
     * issues with the agent, 'info' and higher will impose the least overhead on
     * production applications.
     */
    level: 'error'
  }
}
