var QUnit = require('steal-qunit');
var fixtureSocket = require('./can-fixture-socket').Server;

/**
 * The protocol is:
 * - on created / updated message send ACK with message data and emit created / updated event.
 * - on deleted send ACK with {success: true} and emit deleted event with the removed message id.
 */

// Mock server:
const mockServer = new fixtureSocket.Server();
mockServer.on('connection', function(socket){
	mockServer.on('message created', function(data, fn){
		data.id = 1;

		// send ack on the received event:
		fn(data);

		mockServer.emit('message created', data);
	});

	mockServer.on('message updated', function(data, fn){
		// send ack on the received event:
		fn(data);

		mockServer.emit('message updated', data);
	});

	mockServer.on('message deleted', function(data, fn){
		// send ack on the received event:
		fn({success: true});

		mockServer.emit('message updated', {id: data.id});
	});
});

QUnit.module('Test CRUD resource');

QUnit.test('Message CRUD', function(){
	QUnit.expects(5);

	var socket = io('/message');

	socket.on('connect', function(){
		socket.emit('create message', {title: 'A new message'}, function(data){
			QUnit.deepEqual(data, {id: 1});
		});
	});

	socket.on('message created', function(data){
		QUnit.deepEqual(data, {title: 'A new message', id: 1});

		socket.emit('message update', {title: 'An updated message', id: 1}, function(data){
			QUnit.deepEqual(data, {title: 'An updated message', id: 1});
		});

		socket.emit('message delete', {id: 1}, function(data){
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
