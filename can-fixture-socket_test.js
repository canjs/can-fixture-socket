var QUnit = require('steal-qunit');
var plugin = require('./can-fixture-socket');

QUnit.module('can-fixture-socket');

QUnit.test('Initialized the plugin', function(){
	QUnit.equal(typeof plugin, 'function');
	QUnit.equal(plugin(), 'This is the can-fixture-socket plugin');
});
