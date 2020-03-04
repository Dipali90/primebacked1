(function() {
    'use strict';
    var async = require('async');
    var request = require('request');
    var _ = require('underscore');

    function sendPushNotification(deviceTokens, title, message, callback) {
        var requestObject = {
            "tokens": deviceTokens,
            "profile": sails.config.notification.apiProfile,
            "notification": {
                "title": title,
                "message": message,
                "sound": "default",
                "ios": {
                  "message": message,
                  "badge": 1,
                  "sound": "true"
                }
            }
        };
        var options = {
            url: sails.config.notification.apiUrl,
            headers: {
                'Authorization': 'Bearer ' + sails.config.notification.apiToken,
                'Content-Type': 'application/json'
            },
            method: 'POST',
            body: JSON.stringify(requestObject)
        };

        request.post(options, function(err, httpResponse, body){
            callback(err, body);
        });
    }

})();
