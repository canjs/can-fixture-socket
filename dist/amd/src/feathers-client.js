/*can-fixture-socket@0.5.0#src/feathers-client*/
define(function (require, exports, module) {
    var storeToListeners = require('./store').storeToListeners;
    var assign = require('can-util/js/assign');
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