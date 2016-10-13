/**
 * Manager is created for a url.
 * One manager can create several sockets.
 */
var Server = function(io){
	// PubSub:
	this.events = {};
	this.subscribers = {};
	
	// SocketIO stores an instantiated Manager in cache to reuse it for the same URL.
	// Reset cache of managers since we override Manager prototype to work with this particular instance of the mocked server:
	resetManagerCache(io.managers);
	
	// Override Manager's prototype:
	var origs = mockSocketIO(io.Manager.prototype, this);
	
	// Attache a restore method with access to origs and prototype:
	this.restore = function(){
		restore(io.Manager.prototype, origs);
	}
};
Server.prototype.on = function(event, cb){
	console.log('server.on ' + event);
	sub(this.events,  event, cb);
};
Server.prototype.emit = function(event, data, ack){
	console.log('server.emit ' + event);
	pub(this.subscribers, event, data)
};
function pub(pubsub, event, data){
	console.log(' >>> pub ' + event);
	var subscribers = pubsub[event] || [];
	subscribers.forEach(function(subscriber){
		subscriber(data);
	});
}
function sub(pubsub, event, cb){
	console.log(' <<< sub ' + event);
	if (!pubsub[event]){
		pubsub[event] = [];
	}
	pubsub[event].push(cb);
}

var MockedSocket = function(server){
	this._server = server;
};
MockedSocket.prototype = {
	on: function(event, cb){
		console.log('MockedSocket.on ... ' + event);
		sub(this._server.subscribers, event, cb);
	},
	emit: function(event, data, ack){
		console.log('MockedSocket.emit ...' + event);
		pub(this._server.events, event, data);
	},
	once: function(){
		console.log('MockedSocket.once ...');
	}
};

/**
 * Override Manager.prototype's method to work with the instantiated mocked server.
 * @param managerProto
 * @param server
 * @param options
 * @returns {Array}
 */
function mockSocketIO(managerProto, server){
	// We need to override `open` and `socket` methods:
	var methods = ['open','socket'];
	var origs = methods.map(function(name){
		return {
			name: name,
			method: managerProto[name]
		};
	});
	managerProto.open = managerProto.connect = function(){
		// TODO: this is not necessary anymore since we are mocking the Socket.
		if (this.__fixture__opened){
			// io.socket makes sure connection is opened so `open` gets called twice.
			console.log('already opened');
			return;
		}
		this.__fixture__opened = true;
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
function restore(managerProto, origs){
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
		delete cache[i];
	}
}

module.exports = {
	Server: Server,
	mockSocketIO: mockSocketIO,
	restoreSocketIO: restore
};
