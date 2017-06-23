/*can-fixture-socket@0.7.0-pre.1#can-fixture-socket*/
define(function (require, exports, module) {
    var fixtureSocket = require('./src/index');
    var fixtureStore = require('./src/store');
    module.exports = {
        Server: fixtureSocket.Server,
        requestHandlerToListener: fixtureStore.requestHandlerToListener,
        storeToListeners: fixtureStore.storeToListeners
    };
});