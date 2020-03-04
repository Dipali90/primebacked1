(function () {
    /**
     * Refer to documentation https://firebase.google.com/docs/cloud-messaging/admin/send-messages
     */
    'use strict';
    var admin = require('firebase-admin');
    var serviceIOSAccount = require("../firebase/serviceAccountKeyIOS.json");
    var serviceAndroidAccount = require("../firebase/serviceAccountKeyAndroid.json");
    var IOSConfig = {
        credential: admin.credential.cert(serviceIOSAccount),
        databaseURL: "https://etrucking-b6ce5.firebaseio.com",
        projectId: "etrucking-c17c5"
    };
    var AndroidConfig = {
        credential: admin.credential.cert(serviceAndroidAccount),
        databaseURL: "https://etrucking-b6ce5.firebaseio.com",
        projectId: "etrucking-b6ce5"
    };
    //Default App with IOS Authentication ...
    admin.initializeApp(IOSConfig);
    //Secondary App Under Default App with Android Authentication ...
    var AndroidApp = admin.initializeApp(AndroidConfig, 'secondary');
    //initializing Messaginf variables..
    var IOSMessaging = admin.messaging();
    var AndroidMessaging = admin.messaging(AndroidApp);

    module.exports = {
        sendToDevice: function (deviceTokens, deviceType, payload, callback) {
            var options = {
                priority: "high",
                timeToLive: 60 * 60 * 24 // Expire after 24 hours
            };
            if (deviceType == 'iOS') {
                //Notification For IOS Device..
                IOSMessaging.sendToDevice(deviceTokens, payload, options)
                    .then(function (response) {
                        callback(null, response);
                    })
                    .catch(function (error) {
                        callback(error);
                    });
            } else if (deviceType == 'Android') {
                //Notification For Android Device..
                AndroidMessaging.sendToDevice(deviceTokens, payload, options)
                    .then(function (response) {
                        callback(null, response);
                    })
                    .catch(function (error) {
                        callback(error);
                    });
            }
        },
        sendToTopic: function (topic, payload, callback) {
            admin.messaging().sendToTopic(topic, payload)
                .then(function (response) {
                    callback(null, response);
                })
                .catch(function (error) {
                    callback(error);
                });
        }
    }

})();
