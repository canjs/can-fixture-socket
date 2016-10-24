/*
 * Summary: `io(url)` creates an instance of `io.Manager` for the given url and stores it in cache of managers `io.managers`.
 * If `io` is called with the same URL several times it will lookup Manager in the cache.
 * One manager creates one physical (transport) connection and can create several "virtual" connections within
 * the transport connection.
 * Manager has two main methods: `open` (alias `connect`) and `socket`. The first one establishes a transport connection
 * (e.g. http://localhost), the second one creates a socket.io connection (e.g. http://localhost/users).
 *
 * To fixture socket.io we need to:
 *   - mock a socket server;
 *   - override io.Manager.prototype methods to work with the mocked server.
 */

var subscribeFeathersStoreToServer = require('./feathers-client').subscribeFeathersStoreToServer;

/**
 * @constructor can-fixture-socket.Server Server
 * @parent can-fixture-socket/properties
 * 
 * @signature `new Server( io )`
 * The mocked socket.io-server. On instantiation we:
 *   - clear io.managers which is a cache of Manager instances;
 *   - override Manager.prototype to work with current instance of the mocked server.
 * @param {function} io Imported socket.io-client.
 */
var MockedServer = function(io){
	// PubSub:
	this.events = {};
	this.subscribers = {};

	// SocketIO stores an instantiated Manager in cache to reuse it for the same URL.
	// Reset cache of managers since we override Manager prototype to work with this particular instance of the mocked server:
	resetManagerCache(io.managers);

	// Override Manager's prototype:
	var origs = mockManager(io.Manager.prototype, this);

	// Attach a restore method with access to origs and the prototype:
	this.restore = function(){
		restoreManager(io.Manager.prototype, origs);
		resetManagerCache(io.managers);
	}
};
/*
 * Subscribe to events.
 * @param event Overloaded argument: either a string, then 2nd argument is cb; or an object with multiple events: {ev1: cb1, ev2: cb2, ...}.
 * @param cb
 */
MockedServer.prototype.on = function(event, cb){
	var self = this;
	var events = {};
	console.log('server.on ' + event);
	if (typeof event === 'string'){
		events[event] = cb;
	}
	if (typeof event === 'object'){
		events = event;
	}
	Object.keys(events).forEach(function(name){
		sub(self.events,  name, events[name]);
	})
};
/**
 * The first argument is always `event`
 * The middle arguments are data (usually one or two arguments). We ignore the further data arg if passed (for now).
 * If the last argument is a function then its the ACK callback.
 */
MockedServer.prototype.emit = function(event){
	var dataArgs = Array.prototype.slice.call(arguments, 1);
	console.log('server.emit ' + event);
	pub(this.subscribers, event, dataArgs);
};
/**
 * Subscribes to mocked server events for FeathersJS protocol.
 * @param serviceName The name of Feathers service.
 * @param fixtureStore
 * @param options
 */
MockedServer.prototype.onFeathersService = function(serviceName, fixtureStore, options){
	subscribeFeathersStoreToServer(serviceName, fixtureStore, this, options);
};

/**
 * Manager instantiates Socket. We mock Socket's methods to work with the mocked server instance.
 * @param server Mocked server.
 * @constructor
 */
var MockedSocket = function(server){
	this._server = server;
};
MockedSocket.prototype = {
	on: function(event, cb){
		console.log('MockedSocket.on ... ' + event);
		sub(this._server.subscribers, event, cb);
	},
	/**
	 * The first argument is always `event`
	 * The middle arguments are data (usually one or two arguments).
	 * If the last argument is a function then its the ACK callback.
     */
	emit: function(event){
		var dataArgs = Array.prototype.slice.call(arguments, 1);
		console.log('MockedSocket.emit ...' + event);
		pub(this._server.events, event, dataArgs);
	},
	once: function(){
		console.log('MockedSocket.once ...');
	}
};

/**
 * PubSub helpers.
 * @param pubsub A list of pubs or subs.
 * @param event {String} A name for a pubsub item (e.g. a name of event that we emit or subscribe to).
 * @param dataArgs There could be either one or more data arguments (e.g. FeathersJS) and the last argument can be used for ACK callback. 
 */
function pub(pubsub, event, dataArgs){
	console.log(' >>> pub ' + event);
	var subscribers = pubsub[event] || [];
	subscribers.forEach(function(subscriber){
		subscriber.apply(null, dataArgs);
	});
}
function sub(pubsub, event, cb){
	console.log(' <<< sub ' + event);
	if (!pubsub[event]){
		pubsub[event] = [];
	}
	pubsub[event].push(cb);
}

/**
 * Override Manager.prototype's method to work with the instantiated mocked server.
 * @param managerProto
 * @param server
 * @returns {Array}
 */
function mockManager(managerProto, server){
	// We need to override `open` and `socket` methods:
	var methods = ['open','socket'];
	var origs = methods.map(function(name){
		return {
			name: name,
			method: managerProto[name]
		};
	});
	managerProto.open = managerProto.connect = function(){
		console.log('MockedManager.prototype.open or connect ... arguments:', arguments);
		setTimeout(function(){
			pub(server.subscribers, 'connect');
			pub(server.events, 'connection');
		}, 0);
	};
	managerProto.socket = function(){
		console.log('MockedManager.prototype.socket ...');
		return new MockedSocket(server);
	};
	return origs;
}

/**
 * Restore Manager prototype.
 * @param managerProto
 * @param origs
 */
function restoreManager(managerProto, origs){
	console.log('Restore.');
	origs.forEach(function(orig){
		managerProto[orig.name] = orig.method;
	});
}

/**
 * We need to reset cache of Managers so that the new mocked server would create a new Manager for the same URL.
 * @param cache
 */
function resetManagerCache(cache){
	for (var i in cache){
		if (cache.hasOwnProperty(i)){
			delete cache[i];
		}
	}
}

module.exports = {
	Server: MockedServer,
	mockSocketManager: mockManager,
	restoreManager: restoreManager
};


