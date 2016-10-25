@module {Object} can-fixture-socket
@parent can-ecosystem
@group can-fixture-socket.properties properties
@group can-fixture-socket.types types

@description

can-fixture-socket intercepts socket.io connection and allows to simulate socket.io server responses. 

@type {Object}

`can-fixture-socket` exports an object with a [can-fixture-socket.Server] which implements the socket.io interception, and useful helpers [can-fixture-socket.requestHandlerToListener] and [can-fixture-socket.storeToListeners] which allow to create socket event listeners that work with [can-fixture.Store].

With three simple steps you can test your real-time application that uses socket.io:

- instantiate mocked server;
- mock server behaviour;
- test your application.

```js
var fixtureSocket = require("can-fixture-socket");

// Import socket-io client:
var io = require("socket.io-client");

// Instantiate the mocked server which intercepts socket.io connection:
var mockedServer = new fixtureSocket.Server(io);

// Mock server events:
mockServer.on("connection", function(){
  mockServer.emit("notifications", {test: "OK"})
});

// Client. Create socket.io connection:
var socket = io("http://localhost:8080/api");

socket.on("connect", function(){
  assert.ok(true, "socket connected");
});

socket.on("notifications", function(data){
  assert.deepEqual(data, {test: "OK"}, "received notifications message");
});
```

@body

## Use of basics

can-fixture-socket.Server is a constructor that when given socket.io object intercepts socket connection:
```js
var io = require("socket.io-client");
var fixtureSocket = require("can-fixture-socket");
var server = new fixtureSocket.Server(io);
```

Now we can mock socket server by creating socket event listeners and emitting socket events:
```js
server.on("messages create", function(data){
  console.log("New message received", data);
  server.emit("message created", data);
});
```

In our client app we use socket.io as usually:
```js
var socket = io();
socket.on("connect", function(){
  socket.emit("messages create", {text: "A new message"});
});
socket.on("message created", function(data){
  // data.text === "A new message"
  console.log("Server sent out a new message we just created", data);
});
```

We also can use the acknowledgement callbacks:
```js
mockedServer.on("users create", function(user, ackCb){
  console.log("Save new user to DB and return new user id", user);
  db.users.create(user).then(function(id){
    ackCb({id: id});
  });
});
```

Client code:
```js
var socket = io();
socket.on("connect", function(){
  socket.emit("users create", {name: "Ilya", likes: "skiing"}, function (data) {
    console.log(data.id); // data is what server calls acknowledgement callback with (e.g. data.id is the new user id)
  });
});
```

## Use of can-fixture.Store

With [can-fixture.store] we can create a storage of items and emulate fully working CRUD service. Optionally we can use [can-set.Algebra] to power our store with binary operations on sets.
```js
var fixtureSocket = require("can-fixture-socket");
var io = require("socket.io-client");

// Import can-fixture that provides `store` method for creating a store:
var fixture = require("can-fixture");

// Create a fixture store:
var fixtureStore = fixture.store([
  {id: 1, title: "One"},
  {id: 2, title: "Two"},
  {id: 3, title: "Two"}
], new canSet.Algebra({}));

var mockedServer = new fixtureSocket.Server(io);
```

We also can mock server with fixture store using [can-fixture-socket.requestHandlerToListener] helper:
```js
mockedServer.on({
  "messages get": fixtureSocket.requestHandlerToListener(messagesStore.getData)
});
```

Or use [can-fixture-socket.storeToListeners] helper to wrap all CRUD methods of the fixture store:
```js
var listeners = fixtureSocket.storeToListeners(messagesStore);
mockedServer.on({
  "messages remove": listeners.destroyData,
  "messages create": listeners.createData,
  "messages update": listeners.updateData
});
```

## Use with FeathersJS:

Feathers is a minimalist, service-oriented, real-time web framework for modern applications. It is a NodeJS framework built on top of Express. It allows you to build REST-ful services and works with three [providers](https://docs.feathersjs.com/providers/): standard HTTP communication, WebSockets and Primus.

With [can-fixture-socket] we can test WebSocket provider of Feathers.

The mocked server exposes [can-fixture-socket.Server.prototype.onFeathers] method to simulate [FeathersJS](http://feathersjs.com/) CRUD services. As in previous example we can use [can-fixture.store] for CRUD storage:
```js
var fixtureStore = fixture.store([
  {id: 1, title: One"},
  {id: 2, title: "Two"},
  {id: 3, title: "Three"}
], new canSet.Algebra({}));
	
mockServer.onFeathersService("messages", fixtureStore);
```

Instantiate FeathersJS client app:
```js
var socket = io("http://api.my-feathers-server.com");
var app = feathers()
	.configure(hooks())
	.configure(feathersSocketio(socket));

// Create FeathersJS CRUD service for "messages" resource:
var messagesService = app.service("messages");
```

Now you can test your FeathersJS app:
```
messagesService.find({}).then(function(data){
 assert.equal(data.total, 3, "find should receive 3 items");
});
messagesService.get(1).then(function(data){
 assert.deepEqual(data, {id: 1, title: "One"}, "get should receive an item");
});
messagesService.create({title: "Four"}).then(function(data){
 assert.equal(data.title, "Four", "create should add an new item");
});
```
