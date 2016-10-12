var io = require('socket.io-client');

var managerProto = io.Manager.prototype;
var methods = ['open','connect','on','emit','once'];
var origs = methods.map(function(name){ return managerProto[name];});

function mockSocketIO(server, options){
	managerProto.open = managerProto.connect = function(){
		console.log('Mocked prototype.open or connect ... arguments:', arguments);
		pub(server.events, 'connection');
	};
	managerProto.on = function(name, cb){
		console.log('Mocked prototype.on ...');
		sub(server.subscribers, name, cb);
	};
	managerProto.emit = function(name, data, ack){
		console.log('Mocked prototype.emit ...');
		pub(server.events, event, data);
	};
	managerProto.once = function(){
		console.log('Mocked prototype.once ...');
	};
}
function restore(){
	methods.forEach(function(name){
		managerProto[name] = origs[name];
	});
}

var Server = function(){
	this.events = {};
	this.subscribers = {};
	mockSocketIO(this, {});
};
Server.prototype.on = function(event, cb){
	console.log('server.on');
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
	var subscribers = pubsub[event] || [];
	subscribers.push(cb);
}

module.exports = {
	Server: Server,
	mockSocketIO: mockSocketIO,
	restoreSocketIO: restore
};
