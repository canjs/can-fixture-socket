var QUnit = require('steal-qunit');
var fixtureSocket = require('can-fixture-socket');
var fixture = require('can-fixture');
var canSet = require("can-set");
var io = require('socket.io-client');

var mockServer;
QUnit.noop = function(){};

QUnit.module('can-fixture-socket', {
	beforeEach: function(){
		mockServer = new fixtureSocket.Server(io);
	},
	afterEach: function(){
		mockServer.restore();
	}
});

// Test fixture connection
QUnit.test('basic connection', function(assert){
	//
	// Mock server:
	//
	mockServer.on('connection', function(){
		mockServer.emit('notifications', {test: 'OK'})
	});

	//
	// Test client:
	//
	var done = assert.async();
	assert.expect(2);
	var socket = io('http://localhost:8080/api');
	socket.on('connect', function(){
		assert.ok(true, 'socket connected');
	});
	socket.on('notifications', function(data){
		assert.deepEqual(data, {test: 'OK'}, 'received notifications message');
		done();
	});
});

/**
 * Ex 1. Emulate a low level CRUD API.
 * Let the protocol be:
 * - on created / updated message send ACK with message data and emit created / updated event.
 * - on deleted send ACK with {success: true} and emit deleted event with the removed message id.
 */
QUnit.test('CRUD service', function(assert){
	console.log('Started test 2');
	//
	// Mock server:
	//
	mockServer.on('messages create', function(data, fn){	// fn is the ACK callback
		data.id = 1;

		// send ack on the received event:
		fn && fn(data);

		mockServer.emit('messages created', data);
	});
	mockServer.on('messages update', function(data, fn){
		// send ack on the received event:
		fn && fn(data);

		mockServer.emit('messages updated', data);
	});
	mockServer.on('messages delete', function(data, fn){
		// send ack on the received event:
		fn && fn({success: true});

		mockServer.emit('messages deleted', {id: data.id});
	});

	//
	// Test client:
	//
	var done = assert.async();
	assert.expect(6);

	var socket = io('localhost');

	socket.on('connect', function(){
		socket.emit('messages create', {title: 'A new message'}, function(data){
			// on ACK verify data:
			assert.deepEqual(data, {id: 1, title: 'A new message'}, 'Emit a message to server');
		});
	});

	socket.on('messages created', function(data){
		assert.deepEqual(data, {title: 'A new message', id: 1}, 'Receive messages created');

		socket.emit('messages update', {title: 'An updated message', id: 1}, function(data){
			assert.deepEqual(data, {title: 'An updated message', id: 1}, 'Emit messages update');
		});

		socket.emit('messages delete', {id: 1}, function(data){
			assert.deepEqual(data, {success: true}, 'Emit messages delete');
		});
	});

	socket.on('messages updated', function(data) {
		assert.deepEqual(data, {title: 'An updated message', id: 1}, 'Receive messages updated');
	});

	socket.on('messages deleted', function(data) {
		assert.deepEqual(data, {id: 1}, 'Receive messages deleted');
		done();
	});
});

/**
 * Ex 2. Make a fixture store with data.
 * Emulate CRUD operations.
 * Provide a way to define the CRUD methods, e.g. internally use can-connect dataUrl and map them to FeathersJS style.
 */
QUnit.test('Test with fixture store', function(assert){
	//
	// Mock server
	//
	
	// Socket event handler can accept two arguments: data and a callback that is usually used as ACK.
	
	var messagesStore = fixture.store([
		{id: 1, title: 'One'},
		{id: 2, title: 'Two'}
	], new canSet.Algebra({}));
	
	// #1: directly process fixture.store:
	mockServer.on('messages find', function(query, fn){
		// Fixture.store methods expect two arguments `req` and `res`:
		// - it grabs query from `req.data`;
		// - on error it calls res(403, err);
		// - on success it callse res(data).
		// - format of returned data is {count: 3, data: [...]}
		var req = {data: query};
		var res = function(data, err){
			if (err){
				fn(err)
			} else {
				fn(null, data.data);
			}
		};
		messagesStore.getListData(req, res);
	});
	
	// #2: We can use a helper wrapper for event helper:
	mockServer.on({
		'messages get': fixtureSocket.toFixtureStoreHandler(messagesStore.getData)
	});
	
	//// #3: We also can wrap fixture store to provide socket event ready methods:
	//var socketMessagesStore = fixtureStore.wrapStore(messagesStore);
	//mockServer.on({
	//	'messages remove': socketMessagesStore.destroyData,
	//	'messages create': socketMessagesStore.createData,
	//	'messages update': socketMessagesStore.updateData
	//});

	//
	// Test client:
	//
	var done = assert.async();
	var socket = io('localhost');

	socket.on('connect', function(){
		assert.ok(true, 'client connected to socket');
		socket.emit('messages find', {}, function(err, data){
			assert.equal(data.length, 2, 'emit messages find, ackCb received 2 items');
		});
		socket.emit('messages get', {id: 1}, function(err, data){
			assert.deepEqual(data, {id: 1, title: 'One'}, 'emit messages get, ackCb received the item');
			done();
		});
		//socket.emit('messages update', {id: 1, title: 'OnePlus'}, function(err, data){
		//	assert.deepEqual(data, {id: 1, title: 'OnePlus'});
		//});
		//socket.emit('messages get', {id: 999}, function(err, data){
		//	assert.deepEqual(err, {id: 1, title: 'One'});
		//});
	});
});

/**
 * Ex 3. FeathersJS websocket protocol:
 *   event format: "<path>::<method>"
 *   e.g.
 *     - socket.emit("messages::find", query, cb)
 *     - socket.emit("messages::get", id, query, cb) where cb = function(error, data){...}
 *     - socket.emit("messages::create", data, query, cb)
 *     - socket.emit("messages::update", id, data, query, cb)
 */
