/* jshint node: true */
/* global Promise */

var castv2 = require('castv2-client');
var _ = require('lodash');

function transformSessions(sessions) {
    return _.isArray(sessions) ? sessions.map(function (session) {
        if (session.appId === castv2.DefaultMediaReceiver.APP_ID) {
            session.isDefaultReceiver = true;
        } else {
            session.isDefaultReceiver = false;
        }

        return session;
    }) : [];
}

function sessions(host) {
    return new Promise(function (resolve, reject) {
        var client = new castv2.Client();
        var sessions;
        var error;

        var onClose = _.once(function () {
            if (error) {
                return reject(error);
            }

            return resolve(sessions);
        });

        client.on('error', function (err) {
            error = err;
            onClose();
        });

        client.client.on('close', onClose);
        client.on('close', onClose);

        client.connect(host, function (err) {
            if (err) {
                error = err;
                return onClose();
            }

            client.getSessions(function (err, sess) {
                error = err;
                sessions = transformSessions(sess);

                client.close();
            });
        });
    });
}

module.exports = {
    sessions: sessions
};
