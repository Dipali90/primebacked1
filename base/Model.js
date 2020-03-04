'use strict';

/**
 * api/base/model.js
 *
 * Base model for all sails.js models. This just contains some common code that every "nearly" every model uses.
 */
module.exports = {
  schema: true,

  attributes: {
      
       createdAt: {
         type: 'date',
         defaultsTo: new Date()    
       },
    //    updatedAt: {
    //      type: 'date'
    //    },
      
    // Relation to User object via created user id
    createdUserId: {
      model: 'User',
      columnName: 'createdUserId'
    },
    // Relation to User object via updated user id
    updatedUserId: {
      model: 'User',
      columnName: 'updatedUserId'
    },

    // Dynamic model data attributes

    //Created timestamp as moment object
    // createdAt: function() {
    //     var createAt = (this.createdAt && this.createdAt != '0000-00-00 00:00:00')
    //     ? sails.services['date'].convertDateObjectToUtc(this.createdAt) : new Date();
    //   console.log('add add dispatch.. createdAt', createAt);  
    //   return (this.createdAt && this.createdAt != '0000-00-00 00:00:00')
    //     ? sails.services['date'].convertDateObjectToUtc(this.createdAt) : new Date();
    // },
    // Updated timestamp as moment object
    updatedAt: function() {
      return (this.updatedAt && this.updatedAt != '0000-00-00 00:00:00')
        ? sails.services['date'].convertDateObjectToUtc(this.updatedAt) : null;
    }
  }
};
