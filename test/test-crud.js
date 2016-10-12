var QUnit = require('steal-qunit');
var fixtureSocket = require('./can-fixture-socket').Server;


var mockServer;

// Test fixture connection
QUnit.module('can-fixture-socket', {
	beforeEach: function(){
		mockServer = new fixtureSocket.Server();
	},
	afterEach: function(){
		mockServer.reset();
	}
});
QUnit.test('basic connection', function(){
	//
	// Mock server:
	//
	mockServer.on('connection', function(socket){
		mockServer.emit('notifications', {test: 'OK'})
	});
	
	//
	// Test client:
	//
	QUnit.expects(2);
	var socket = io('localhost');
	socket.on('connect', function(){
		QUnit.ok(true, 'connected');
	});
	socket.on('notifications', function(data){
		QUnit.deepEqual(data, {test: 'OK'});
	});
});

/**
 * Emulate a low level CRUD API.
 * Let the protocol be:
 * - on created / updated message send ACK with message data and emit created / updated event.
 * - on deleted send ACK with {success: true} and emit deleted event with the removed message id.
 */
QUnit.test('CRUD service', function(){
	//
	// Mock server:
	//
	mockServer.on('messages create', function(data, fn){	// fn is the ACK callback
		data.id = 1;

		// send ack on the received event:
		fn(data);

		mockServer.emit('messages created', data);
	});
	mockServer.on('messages update', function(data, fn){
		// send ack on the received event:
		fn(data);

		mockServer.emit('messages updated', data);
	});
	mockServer.on('messages deleted', function(data, fn){
		// send ack on the received event:
		fn({success: true});

		mockServer.emit('messages deleted', {id: data.id});
	});
	
	//
	// Test client:
	//
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
QUnit.test('Test fixture store', function(){
	//
	// Mock server
	//
	var messagesStore = fixture.store([
		{id: 1, title: 'One'},
		{id: 2, title: 'Two'}
	]);

	// Options like mapping methods (e.g. fixture.store -> feathers).
	var options = {
		getListData: 'find',
		getData: 'get',
		createData: 'create',
		updateData: 'update',
		destroyData: 'remove'
	};

	fixtureSocket.connectStore('messages', messagesStore, options);
	
	//
	// Test client:
	//
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
