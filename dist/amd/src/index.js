/*can-fixture-socket@0.5.0#src/index*/
define(function (require, exports, module) {
    var subscribeFeathersStoreToServer = require('./feathers-client').subscribeFeathersStoreToServer;
    var MockedServer = function (io) {
        this.io = io;
        this.events = {};
        this.subscribers = {};
        resetManagerCache(io.managers);
        this.origs = mockManager(io.Manager.prototype, this);
    };
    MockedServer.prototype.on = function (event, cb) {
        var self = this;
        var events = {};
        if (typeof event === 'string') {
            events[event] = cb;
        }
        if (typeof event === 'object') {
            events = event;
        }
        Object.keys(events).forEach(function (name) {
            sub(self.events, name, events[name]);
        });
    };
    MockedServer.prototype.emit = function (event) {
        var dataArgs = Array.prototype.slice.call(arguments, 1);
        pub(this.subscribers, event, dataArgs);
    };
    MockedServer.prototype.onFeathersService = function (serviceName, fixtureStore, options) {
        subscribeFeathersStoreToServer(serviceName, fixtureStore, this, options);
    };
    MockedServer.prototype.restore = function () {
        restoreManager(this.io.Manager.prototype, this.origs);
        resetManagerCache(this.io.managers);
    };
    var MockedSocket = function (server) {
        this._server = server;
    };
    MockedSocket.prototype = {
        on: function (event, cb) {
            console.log('MockedSocket.on ... ' + event);
            sub(this._server.subscribers, event, cb);
        },
        emit: function (event) {
            var dataArgs = Array.prototype.slice.call(arguments, 1);
            console.log('MockedSocket.emit ...' + event);
            pub(this._server.events, event, dataArgs);
        },
        once: function () {
            console.log('MockedSocket.once ...');
        }
    };
    function pub(pubsub, event, dataArgs) {
        console.log(' >>> pub ' + event);
        var subscribers = pubsub[event] || [];
        subscribers.forEach(function (subscriber) {
            subscriber.apply(null, dataArgs);
        });
    }
    function sub(pubsub, event, cb) {
        console.log(' <<< sub ' + event);
        if (!pubsub[event]) {
            pubsub[event] = [];
        }
        pubsub[event].push(cb);
    }
    function mockManager(managerProto, server) {
        var methods = [
            'open',
            'socket'
        ];
        var origs = methods.map(function (name) {
            return {
                name: name,
                method: managerProto[name]
            };
        });
        managerProto.open = managerProto.connect = function () {
            console.log('MockedManager.prototype.open or connect ... arguments:', arguments);
            setTimeout(function () {
                pub(server.subscribers, 'connect');
                pub(server.events, 'connection');
            }, 0);
        };
        managerProto.socket = function () {
            console.log('MockedManager.prototype.socket ...');
            return new MockedSocket(server);
        };
        return origs;
    }
    function restoreManager(managerProto, origs) {
        console.log('Restore.');
        origs.forEach(function (orig) {
            managerProto[orig.name] = orig.method;
        });
    }
    function resetManagerCache(cache) {
        for (var i in cache) {
            if (cache.hasOwnProperty(i)) {
                delete cache[i];
            }
        }
    }
    module.exports = {
        Server: MockedServer,
        mockSocketManager: mockManager,
        restoreManager: restoreManager
    };
});