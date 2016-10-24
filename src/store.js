var extractResponse = require('can-fixture/core').extractResponse;

/**
 * Fixture.store helpers: requestHandlerToListener. Transforms ((req, res) -> ()) -> ((str, cb) -> ()), where cb::(err, data) -> ().
 * @param method {Function} A method like fixture.store.getDataList.
 *
 * Fixture.store methods expect two arguments `req` and `res`:
 * - it grabs query from `req.data`;
 * - on error it calls res(403, err);
 * - on success it callse res(data).
 * - format of returned data is:
 *     - for getDataList: {count: <number>, limit: <number>, offset: <number> , data: [{...},{...}, ...]}
 *     - for getData: item object {...}
 */
function requestHandlerToListener(method){
	return function(query, fn){
		var req = {data: query};
		var res = function(){
			var response = extractResponse.apply(null, arguments);
			if (response[0] === 200){
				fn(null, response[1]);
			} else {
				fn(response[1]);
			}
		};
		method(req, res);
	}
}

/**
 * Wraps all methods of fixture.store into socket ack handler.
 * @param fixtureStore
 * @returns {*}
 */
function storeToListeners(fixtureStore){
	var methods = ['getListData', 'getData', 'updateData', 'createData', 'destroyData'];
	return methods.reduce(function(listeners, method){
		listeners[method] = requestHandlerToListener(fixtureStore[method]);
		return listeners;
	}, {});
}

module.exports = {
	requestHandlerToListener: requestHandlerToListener,
	storeToListeners: storeToListeners
};
