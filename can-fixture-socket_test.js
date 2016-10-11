import QUnit from 'steal-qunit';
import plugin from './can-fixture-socket';

QUnit.module('can-fixture-socket');

QUnit.test('Initialized the plugin', function(){
  QUnit.equal(typeof plugin, 'function');
  QUnit.equal(plugin(), 'This is the can-fixture-socket plugin');
});
