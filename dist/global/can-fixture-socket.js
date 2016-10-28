/*[global-shim-start]*/
(function(exports, global, doEval){ // jshint ignore:line
	var origDefine = global.define;

	var get = function(name){
		var parts = name.split("."),
			cur = global,
			i;
		for(i = 0 ; i < parts.length; i++){
			if(!cur) {
				break;
			}
			cur = cur[parts[i]];
		}
		return cur;
	};
	var set = function(name, val){
		var parts = name.split("."),
			cur = global,
			i, part, next;
		for(i = 0; i < parts.length - 1; i++) {
			part = parts[i];
			next = cur[part];
			if(!next) {
				next = cur[part] = {};
			}
			cur = next;
		}
		part = parts[parts.length - 1];
		cur[part] = val;
	};
	var useDefault = function(mod){
		if(!mod || !mod.__esModule) return false;
		var esProps = { __esModule: true, "default": true };
		for(var p in mod) {
			if(!esProps[p]) return false;
		}
		return true;
	};
	var modules = (global.define && global.define.modules) ||
		(global._define && global._define.modules) || {};
	var ourDefine = global.define = function(moduleName, deps, callback){
		var module;
		if(typeof deps === "function") {
			callback = deps;
			deps = [];
		}
		var args = [],
			i;
		for(i =0; i < deps.length; i++) {
			args.push( exports[deps[i]] ? get(exports[deps[i]]) : ( modules[deps[i]] || get(deps[i]) )  );
		}
		// CJS has no dependencies but 3 callback arguments
		if(!deps.length && callback.length) {
			module = { exports: {} };
			var require = function(name) {
				return exports[name] ? get(exports[name]) : modules[name];
			};
			args.push(require, module.exports, module);
		}
		// Babel uses the exports and module object.
		else if(!args[0] && deps[0] === "exports") {
			module = { exports: {} };
			args[0] = module.exports;
			if(deps[1] === "module") {
				args[1] = module;
			}
		} else if(!args[0] && deps[0] === "module") {
			args[0] = { id: moduleName };
		}

		global.define = origDefine;
		var result = callback ? callback.apply(null, args) : undefined;
		global.define = ourDefine;

		// Favor CJS module.exports over the return value
		result = module && module.exports ? module.exports : result;
		modules[moduleName] = result;

		// Set global exports
		var globalExport = exports[moduleName];
		if(globalExport && !get(globalExport)) {
			if(useDefault(result)) {
				result = result["default"];
			}
			set(globalExport, result);
		}
	};
	global.define.orig = origDefine;
	global.define.modules = modules;
	global.define.amd = true;
	ourDefine("@loader", [], function(){
		// shim for @@global-helpers
		var noop = function(){};
		return {
			get: function(){
				return { prepareGlobal: noop, retrieveGlobal: noop };
			},
			global: global,
			__exec: function(__load){
				doEval(__load.source, global);
			}
		};
	});
}
)({},window,function(__$source__, __$global__) { // jshint ignore:line
	eval("(function() { " + __$source__ + " \n }).call(__$global__);");
}
)
/*can-fixture-socket@0.5.5#src/store*/
define('can-fixture-socket/src/store', function (require, exports, module) {
    var extractResponse = require('can-fixture/core').extractResponse;
    function requestHandlerToListener(method) {
        return function (query, fn) {
            var req = { data: query };
            var res = function () {
                var response = extractResponse.apply(null, arguments);
                if (response[0] === 200) {
                    fn(null, response[1]);
                } else {
                    fn(response[1]);
                }
            };
            method(req, res);
        };
    }
    function storeToListeners(fixtureStore) {
        var methods = [
            'getListData',
            'getData',
            'updateData',
            'createData',
            'destroyData'
        ];
        return methods.reduce(function (listeners, method) {
            listeners[method] = requestHandlerToListener(fixtureStore[method]);
            return listeners;
        }, {});
    }
    module.exports = {
        requestHandlerToListener: requestHandlerToListener,
        storeToListeners: storeToListeners
    };
});
/*can-fixture-socket@0.5.5#src/feathers-client*/
define('can-fixture-socket/src/feathers-client', function (require, exports, module) {
    var storeToListeners = require('can-fixture-socket/src/store').storeToListeners;
    var assign = require('can-util/js/assign/assign');
    function subscribeFeathersStoreToServer(serviceName, fixtureStore, mockServer, options) {
        var listeners = storeToListeners(fixtureStore);
        mockServer.on(serviceName + '::find', toFeathersDataHandler(listeners.getListData, null, toFeathersFind));
        mockServer.on(serviceName + '::get', toFeathersDataHandler(listeners.getData, wrapToId(options), null));
        mockServer.on(serviceName + '::remove', toFeathersRemoveHandler(listeners.getData, listeners.destroyData, options));
        mockServer.on(serviceName + '::create', toFeathersCreateHandler(listeners.createData));
        mockServer.on(serviceName + '::update', toFeathersUpdateHandler(listeners.updateData, options));
    }
    function toFeathersDataHandler(method, queryTransformer, dataTransformer) {
        return function (query) {
            var args = Array.prototype.slice.call(arguments), fn;
            if (typeof args[args.length - 1] === 'function') {
                fn = args[args.length - 1];
            }
            query = queryTransformer ? queryTransformer(query) : query;
            method(query, function (err, data) {
                if (err) {
                    fn && fn(err);
                } else {
                    data = dataTransformer ? dataTransformer(data) : data;
                    fn && fn(null, data);
                }
            });
        };
    }
    function wrapToId(options) {
        return function (id) {
            var o = {}, idProp = options && options.id || 'id';
            o[idProp] = id;
            return o;
        };
    }
    function toFeathersFind(data) {
        return {
            total: data.count,
            limit: data.limit,
            skip: data.offset,
            data: data.data
        };
    }
    function toFeathersRemoveHandler(getData, destroyData, options) {
        return function (id, query, fn) {
            var setQuery = wrapToId(options)(id);
            getData(setQuery, function (err, item) {
                if (err) {
                    fn(err);
                } else {
                    destroyData(setQuery, function (err, data) {
                        if (err) {
                            fn(err);
                        } else {
                            fn(null, item);
                        }
                    });
                }
            });
        };
    }
    function toFeathersUpdateHandler(updateData, options) {
        return function (id, data, query, fn) {
            var setQuery = wrapToId(options)(id);
            updateData(assign(setQuery, data), function (err, data2) {
                if (err) {
                    fn(err);
                } else {
                    fn(null, assign(setQuery, assign(data, data2)));
                }
            });
        };
    }
    function toFeathersCreateHandler(createData) {
        return function (data, query, fn) {
            createData(data, function (err, data2) {
                if (err) {
                    fn(err);
                } else {
                    fn(null, assign(data, data2));
                }
            });
        };
    }
    module.exports = { subscribeFeathersStoreToServer: subscribeFeathersStoreToServer };
});
/*can-fixture-socket@0.5.5#src/index*/
define('can-fixture-socket/src/index', function (require, exports, module) {
    var subscribeFeathersStoreToServer = require('can-fixture-socket/src/feathers-client').subscribeFeathersStoreToServer;
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
/*can-fixture-socket@0.5.5#can-fixture-socket*/
define('can-fixture-socket', function (require, exports, module) {
    var fixtureSocket = require('can-fixture-socket/src/index');
    var fixtureStore = require('can-fixture-socket/src/store');
    module.exports = {
        Server: fixtureSocket.Server,
        requestHandlerToListener: fixtureStore.requestHandlerToListener,
        storeToListeners: fixtureStore.storeToListeners
    };
});
/*[global-shim-end]*/
(function(){ // jshint ignore:line
	window._define = window.define;
	window.define = window.define.orig;
}
)();