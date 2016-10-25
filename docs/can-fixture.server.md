@constructor can-fixture-socket.Server Server
@parent can-fixture-socket.properties
@group can-fixture-socket.Server.prototype prototype

@signature `new Server( io )`

When server is instantiated with socket.io `io` object it intercepts socket.io connection and allows to mock socket.io server behaviour. On instantiation we:
  - empty `io.managers` object which is a cache of socket.io `io.Manager` instances;
  - override `io.Manager.prototype` to work with current instance of the mocked server.
  
```js
var io = require("socket.io-client");
var fixtureSocket = require("can-fixture-socket");
var mockedServer = new fixtureSocket.Server(io);
```

@param {Object} io Imported `socket.io-client` object.

@body

## Use

1. Instantiate server to intercept socket.io connections:
```js
var io = require("socket.io-client");
var fixtureSocket = require("can-fixture-socket");
var mockedServer = new fixtureSocket.Server(io);
```

2. Mock socket.io server behaviour:
```js
mockedServer.on("connection", function(){
  mockedServer.emit("notifications", [{text: "A new notification"}]);
});

mockedServer.on("some event", function(data){
  console.log("Client send some ", data);
});
```

## Examples

### Simple CRUD service

...

### CRUD service with fixture store

Lets see how we can test a possible implementation of CRUD service that utilizes socket.io ACK callbacks. We will use fixture store to emulate our CRUD storage and link it to our mocked server.

```js
var fixture = require("can-fixture");

// First, lets create fixture store:
var fixtureStore = fixture.store([
  {id: 1, title: "One", rank: "good"},
  {id: 2, title: "Two", rank: "average"},
  {id: 3, title: "Three", rank: "good"}
], new canSet.Algebra({}));

// And instantiate a mocked server:
var io = require("socket.io-client");
var fixtureSocket = require("can-fixture-socket");
var mockedServer = new fixtureSocket.Server(io);
```

Fixture store is designed to work with XHR services, thus its methods take two arguments: `request` and `response`. See [can-fixture.Store.prototype.getListData] for more details. Our mocked server can listen to socket events and its event listener expects data and an optional ACK callback. To transform request handler to event listener we can use [can-fixture-socket.requestHandlerToListener]:

Now we can create socket event listeners for our CRUD operations:
```js
mockServer.on("messages find", fixtureSocket.requestHandlerToListener(fixtureStore.getListData));
mockServer.on("messages get", fixtureSocket.requestHandlerToListener(fixtureStore.getData));
mockServer.on("messages remove", fixtureSocket.requestHandlerToListener(fixtureStore.destroyData));
mockServer.on("messages create", fixtureSocket.requestHandlerToListener(fixtureStore.createData));
mockServer.on("messages update", fixtureSocket.requestHandlerToListener(fixtureStore.updateData));
```

There is also a helper [can-fixture-socket.storeToListeners] to create all listeners at once:
```
var listeners = fixtureSocket.storeToListeners(messagesStore);
mockServer.on({
	"messages find": listeners.getListData,
	"messages get": listeners.getData,
	"messages remove": listeners.destroyData,
	"messages create": listeners.createData,
	"messages update": listeners.updateData
});
```

Now lets implement a CRUD model on client:
```js
var socket = io("localhost");

socket.emit("messages find", {rank: "good"}, function(err, response){
  if (err){
    console.log("Error: ", err);
    return;
  }
  console.log(`We found ${response.count} good items", response.data);
});
```
