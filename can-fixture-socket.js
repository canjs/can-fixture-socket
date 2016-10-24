var fixtureSocket = require('./src/index');
var fixtureStore = require('./src/store');
var fixtureFeathers = require('./src/feathers-client');

module.exports = {
	Server: fixtureSocket.Server,
	mockSocketManager: fixtureSocket.mockSocketManager,
	restoreManager: fixtureSocket.restoreManager,
	requestHandlerToListener: fixtureStore.requestHandlerToListener,
	storeToListeners: fixtureStore.storeToListeners
};
