var QUnit = require('steal-qunit');
var fixtureSocket = require('./can-fixture-socket').Server;


var mockServer;


/**
 * Ex. 1. Emulate a low level CRUD API.
 * Let the protocol be:
 * - on created / updated message send ACK with message data and emit created / updated event.
 * - on deleted send ACK with {success: true} and emit deleted event with the removed message id.
 */
QUnit.module('Low level API', {
	beforeEach: function(){
		// Mock server:
		mockServer = new fixtureSocket.Server();
		mockServer.on('connection', function(socket){
			mockServer.on('messages create', function(data, fn){	// fn is the ACK callback
				data.id = 1;

				// send ack on the received event:
				fn(data);

				mockServer.emit('messages create', data);
			});

			mockServer.on('messages update', function(data, fn){
				// send ack on the received event:
				fn(data);

				mockServer.emit('messages update', data);
			});

			mockServer.on('message deleted', function(data, fn){
				// send ack on the received event:
				fn({success: true});

				mockServer.emit('message deleted', {id: data.id});
			});
		});
	},
	afterEach: function(){
		mockServer.reset();
	}
});
QUnit.test('Message CRUD', function(){
	QUnit.expects(5);

	var socket = io('localhost');

	socket.on('connect', function(){
		socket.emit('messages create', {title: 'A new message'}, function(data){
			// on ACK verify data:
			QUnit.deepEqual(data, {id: 1});
		});
	});

	socket.on('messages created', function(data){
		QUnit.deepEqual(data, {title: 'A new message', id: 1});

		socket.emit('messages update', {title: 'An updated message', id: 1}, function(data){
			QUnit.deepEqual(data, {title: 'An updated message', id: 1});
		});

		socket.emit('messages delete', {id: 1}, function(data){
			QUnit.deepEqual(data, {success: true});
		});
	});

	socket.on('message updated', function(data) {
		QUnit.deepEqual(data, {title: 'An updated message', id: 1});
	});

	socket.on('message deleted', function(data) {
		QUnit.deepEqual(data, {title: 'An updated message', id: 1});
	});
});

/**
 * Ex. 2. Make a fixture store with data.
 * Emulate CRUD operations.
 * Provide a way to define the CRUD methods, e.g. internally use can-connect dataUrl and map them to FeathersJS style.
 * 
 * FeathersJS websocket protocol:
 *   event format: "<path>::<method>"
 *   e.g.
 *     - send("messages::find", query)
 *     - send("messages::get", id, query)
 *     - send("messages::create", data, query)
 *     - send("messages::update", id, data, query)
 */
QUnit.module('Fixture store', {
	before: function(){
		// Options like mapping methods (e.g. can-connect dataUrl -> feathers).
		var options = {
			getListData: 'find',
			getData: 'get',
			createData: 'create',
			updateData: 'update',
			destroyData: 'remove'
		};
		mockServer = new fixtureSocket.ServerStore({
			messages: [
				{id: 1, title: 'One'},
				{id: 2, title: 'Two'}
			]
		}, options);
	}
});

QUnit.test('Test fixture store', function(){

	var socket = io('localhost');
	
	socket.on('connect', function(){
		socket.emit('messages find', {}, function(data){
			QUnit.equal(data.length, 2);
		});
		socket.emit('messages get', {id: 1}, function(data){
			QUnit.deepEqual(data, {id: 1, title: 'One'});
		});
		socket.emit('messages update', {id: 1, title: 'OnePlus'}, function(data){
			QUnit.deepEqual(data, {id: 1, title: 'OnePlus'});
		});
	});
});
