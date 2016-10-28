/*can-fixture-socket@0.5.5#can-fixture-socket*/
define(function (require, exports, module) {
    var fixtureSocket = require('./src/index');
    var fixtureStore = require('./src/store');
    module.exports = {
        Server: fixtureSocket.Server,
        requestHandlerToListener: fixtureStore.requestHandlerToListener,
        storeToListeners: fixtureStore.storeToListeners
    };
});