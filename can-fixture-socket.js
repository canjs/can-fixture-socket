/**
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

/**
 * The mocked socket.io-server. On instantiation we:
 *   - clear io.managers which is a cache of Manager instances;
 *   - override Manager.prototype to work with current instance of the mocked server. 
 * @param io Imported socket.io-client.
 * @constructor
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
/**
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
MockedServer.prototype.emit = function(event, data, ackFn){
	console.log('server.emit ' + event);
	pub(this.subscribers, event, data, ackFn)
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
	emit: function(event, data, ackFn){
		console.log('MockedSocket.emit ...' + event);
		pub(this._server.events, event, data, ackFn);
	},
	once: function(){
		console.log('MockedSocket.once ...');
	}
};

/**
 * PubSub helpers.
 * @param pubsub A list of pubs or subs.
 * @param event {String} A name for a pubsub item (e.g. a name of event that we emit or subscribe to).
 * @param data
 * @param ackFn {Function} A acknowledgement function, is used for WebSocket ACK.
 */
function pub(pubsub, event, data, ackFn){
	console.log(' >>> pub ' + event);
	var subscribers = pubsub[event] || [];
	subscribers.forEach(function(subscriber){
		subscriber(data, ackFn);
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


//TODO: separate the following out from here.

/**
 * Fixture.store helpers: toFixtureStoreHandler
 * @param method {Function} A method like fixture.store method like getDataList.
 *
 * Fixture.store methods expect two arguments `req` and `res`:
 * - it grabs query from `req.data`;
 * - on error it calls res(403, err);
 * - on success it callse res(data).
 * - format of returned data is: 
 *     - for getDataList: {count: 3, data: [{...},{...}, ...]}
 *     - for getData: item object {...}
 */
function toFixtureStoreHandler(method){
	return function(query, fn){
		var req = {data: query};
		
		// TODO: use `extractResponse` from [can-fixture.core](https://github.com/canjs/can-fixture/blob/master/core.js#L271).
		var res = function(data, err){
			if (err){
				fn(err)
			} else {
				// getListData format:
				if (data.data){
					data = data.data;
				}
				fn(null, data);
			}
		};
		method(req, res);
	}
}

/**
 * Wraps all methods of fixture.store into socket ack handler.
 * @param fixtureStore
 * @returns {*}
 */
function wrapFixtureStore(fixtureStore){
	var methods = ['getListData', 'getData', 'updateData', 'createData', 'destroyData'];
	return methods.reduce(function(wrappedStore, method){
		wrappedStore[method] = toFixtureStoreHandler(fixtureStore[method]);
		return wrappedStore;
	}, {});
}

/**
 * Wraps fixture.store considering FeathersJS arguments format.
 * @param fixtureStore
 * @returns {*}
 */
function feathersConnectStoreToServer(serviceName, fixtureStore, mockServer){
	var wrappedStore = wrapFixtureStore(messagesStore);
	mockServer.on(serviceName + '::find', function(query, fn){
		//wrappedStore.getListData();
	});
	mockServer.on({
		'messages::remove': feathersStore.destroyData,
		'messages::create': feathersStore.createData,
		'messages::update': feathersStore.updateData
	});
}

module.exports = {
	Server: MockedServer,
	mockSocketManager: mockManager,
	restoreManager: restoreManager,
	toFixtureStoreHandler: toFixtureStoreHandler,
	wrapFixtureStore: wrapFixtureStore,
	feathersConnectStoreToServer: feathersConnectStoreToServer
};
