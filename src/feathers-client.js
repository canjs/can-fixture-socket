/**
 * FEATHERS protocol.
 * Feathers service api (REST provider): https://docs.feathersjs.com/rest/readme.html
 * 
 * 
 * - Common Error Response Packet:
 * REQ: 422["messages::get",111,{}]
 * RES: 432[{"stack":"NotFound: No record found for id '111' ...","message":"No record found for id '111'","type":"FeathersError","name":"NotFound","code":404,"className":"not-found","errors":{}}]
 * 
 * 
 * - socket.emit('messages::find', {}, function(error, data){});
 * REQ: 421["messages::find",{"$sort":{"createdAt":-1},"$limit":10}]
 * RES: 434[null,{"total":10,"limit":5,"skip":0,"data":[]}]
 * 
 * 
 * - socket.emit('messages::get', 'uOybkd5RVe5wKoxy', {}, function(error, data){});
 * REQ: 422["messages::get","uOybkd5RVe5wKoxy",{}]
 * RES: 432[null,{"text":"Hello from cmd!","createdAt":1475294332699,"_id":"uOybkd5RVe5wKoxy"}]
 * 
 * 
 * - socket.emit('messages::create', {text: 'New message'}, {}, function(error, data){});
 * REQ: 422["messages::create",{"text":"new message"},{}]
 * RES: 432[null,{"text":"new message","userId":"Ke8I0Kmn0lCyrEaq","createdAt":1476722319537,"_id":"ttnWkW4YhGRc1CDM","sentBy":{"email":"fadeev.ilya@gmail.com","password":"$2a$10$QqI4Uamr/mTH8P/.W0TNTuofjRuNDZLuyNaQzl3vHXhpzrWBwCo7q","avatar":"https://s.gravatar.com/avatar/44751bab986933e4405394fb32d6b91d?s=60","_id":"Ke8I0Kmn0lCyrEaq"}}]
 * EXT: 42["messages created",{"text":"new message","userId":"Ke8I0Kmn0lCyrEaq","createdAt":1476722319537,"_id":"ttnWkW4YhGRc1CDM","sentBy":{"email":"fadeev.ilya@gmail.com","password":"$2a$10$QqI4Uamr/mTH8P/.W0TNTuofjRuNDZLuyNaQzl3vHXhpzrWBwCo7q","avatar":"https://s.gravatar.com/avatar/44751bab986933e4405394fb32d6b91d?s=60","_id":"Ke8I0Kmn0lCyrEaq"}}]
 * 
 * 
 * - socket.emit('messages::remove', 'yDLARueVwSF0S6v8', {}, function(error, data){});
 * REQ: 422["messages::remove","yDLARueVwSF0S6v8",{}]
 * RES: 432[null,{"text":"helllllo","userId":"Ke8I0Kmn0lCyrEaq","createdAt":1476722461622,"_id":"yDLARueVwSF0S6v8"}]
 * EXT: 42["messages removed",{"text":"helllllo","userId":"Ke8I0Kmn0lCyrEaq","createdAt":1476722461622,"_id":"yDLARueVwSF0S6v8"}]
 * 
 * 
 * - socket.emit('messages::update', 'ttnWkW4YhGRc1CDM', {}, function(error, data){});
 * REQ: 422["messages::update","ttnWkW4YhGRc1CDM",{"text":"Updated text!"},{}]
 * RES: 432[null,{"text":"Updated text!","_id":"ttnWkW4YhGRc1CDM"}]
 * EXT: 42 ["messages updated",{"text":"Updated text!","_id":"ttnWkW4YhGRc1CDM"}]
 * 
 */


/**
 * Wraps fixture.store considering FeathersJS arguments format.
 * Transforms ((query, fn))
 * @param fixtureStore
 * @returns {*}
 *
 * fixture.store data:
 * 		getListData: {}
 */
function connectFeathersStoreToServer(serviceName, fixtureStore, mockServer){
	var wrappedStore = wrapFixtureStore(fixtureStore);
	mockServer.on(serviceName + '::find', function(query, fn){
		wrappedStore.getListData(query, function(err, data){
			if (err){
				fn(err);
			} else {
				// fixture.store.getListData: {count, limit, offset, data}
				// feathers.find:             {total, limit, skip, data}
				fn(null, {
					total: data.count,
					limit: data.limit,
					skip: data.offset,
					data: data.data
				})
			}
		})
	});
	mockServer.on(serviceName + '::get', function(query, fn){
		wrappedStore.getData(query, function(err, data){
			if (err){
				fn(err);
			} else {
				// fixture.store.getListData: {count, limit, offset, data}
				// feathers.find:             {total, limit, skip, data}
				fn(null, {
					total: data.count,
					limit: data.limit,
					skip: data.offset,
					data: data.data
				})
			}
		})
	});
	mockServer.on({
		'messages::remove': wrappedStore.destroyData,
		'messages::create': wrappedStore.createData,
		'messages::update': wrappedStore.updateData
	});
}

function toFeathersData(method){
	return function(query, fn){
		method(query, function(err, data){
			if (err){
				fn(err);
			} else {
				// fixture.store.getListData: {count, limit, offset, data}
				// feathers.find:             {total, limit, skip, data}
				fn(null, {
					total: data.count,
					limit: data.limit,
					skip: data.offset,
					data: data.data
				})
			}
		})
	}
}

function toFeathersGet(data){
	return {
		total: data.count,
		limit: data.limit,
		skip: data.offset,
		data: data.data
	};
}

module.export.connectFeathersStoreToServer = connectFeathersStoreToServer;
