/*can-fixture-socket@1.0.0#src/store*/
define([
    'require',
    'exports',
    'module',
    'can-fixture/core'
], function (require, exports, module) {
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