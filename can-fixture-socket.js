var io = require('socket.io-client');

/**
 * Manager is created for a url.
 * One manager can create several sockets.
 */
var Server = function(){
	this.events = {};
	this.subscribers = {};
	var origs = mockSocketIO(io.Manager.prototype, this, {});
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
	this.server = server;
};
MockedSocket.prototype = {
	on: function(event, cb){
		console.log('MockedSocket.on ... ' + event);
		sub(this.server.subscribers, event, cb);
	},
	emit: function(event, data, ack){
		console.log('MockedSocket.emit ...' + event);
		pub(this.server.events, event, data);
	},
	once: function(){
		console.log('MockedSocket.once ...');
	}
};

function mockSocketIO(managerProto, server, options){
	// We need to override `open` and `socket` methods:
	var methods = ['open','socket'];
	var origs = methods.map(function(name){
		return {
			name: name,
			method: managerProto[name]
		};
	});
	managerProto.open = managerProto.connect = function(){
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

function restore(managerProto, origs){
	console.log('Restore.');
	origs.forEach(function(orig){
		managerProto[orig.name] = orig.method;
	});
}

module.exports = {
	Server: Server,
	mockSocketIO: mockSocketIO,
	restoreSocketIO: restore
};
