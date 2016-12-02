/*can-fixture-socket@0.5.7#can-fixture-socket*/
var fixtureSocket = require('./src/index.js');
var fixtureStore = require('./src/store.js');
module.exports = {
    Server: fixtureSocket.Server,
    requestHandlerToListener: fixtureStore.requestHandlerToListener,
    storeToListeners: fixtureStore.storeToListeners
};