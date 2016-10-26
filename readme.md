# can-fixture-socket

[![Build Status](https://travis-ci.org/canjs/can-fixture-socket.png?branch=master)](https://travis-ci.org/canjs/can-fixture-socket)

Intercepts socket.io connection and allows to simulate socket.io server behaviour. 

`can-fixture-socket` exports an object with:
- **Server** - a constructor function, intercepts the socket.io connection;
- **requestHandlerToListener** - a helper, to transforms XHR request handler into [can-fixture-socket.socket-event-listener]; 
- **storeToListeners** - a helper, transforms all [can-fixture.store](http://canjs.github.io/canjs/doc/can-fixture.store.html) request handlers into socket event listeners.

With three simple steps you can test your real-time application that uses socket.io:

 1. instantiate server to intercept socket.io;
 2. mock server behaviour;
 3. test your application.


## Table of Content

* [Install](#install)
* [Usage](#usage)
  + [Use basics](#use-basics)
    + [Acknowledgement callbacks](#acknowledgement-callbacks)
  + [Use with can-fixture.Store](#use-with-can-fixturestore)
  + [Use with FeathersJS](#use-with-feathersjs)
  + Other
    + [ES6 use](#es6-use)
    + [AMD use](#amd-use)
    + [Standalone use](#standalone-use)
* [Contributing](#contributing)
  + [Making a Build](#making-a-build)
  + [Running the tests](#running-the-tests)


## Install

Use npm to install can-fixture-socket:
```
npm install can-fixture-socket --save
```

## Usage

### Use basics

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

#### Acknowledgement callbacks

We also can use socket.io [acknowledgement callbacks](http://socket.io/docs/#sending-and-getting-data-(acknowledgements)):
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

### Use with can-fixture.Store

With can-fixture [can-fixture.store] we can create a storage of items and emulate a fully working CRUD service. Optionally we can use [can-set.Algebra] to power our store with binary operations on sets.
```js
var fixtureSocket = require("can-fixture-socket");
var io = require("socket.io-client");

// Import can-fixture that provides `store` method for creating a store:
var fixture = require("can-fixture");
var canSet = require("can-set");

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

### Use with FeathersJS

Feathers is a minimalist, service-oriented, real-time web framework for modern applications. It is a NodeJS framework built on top of Express. It allows you to build REST-ful services and works with three [providers](https://docs.feathersjs.com/providers/): standard HTTP communication, WebSockets and Primus.

With [can-fixture-socket] we can test WebSocket provider of Feathers.

The mocked server exposes [can-fixture-socket.Server.prototype.onFeathers] method to simulate [FeathersJS](http://feathersjs.com/) CRUD services. As in previous example we can use [can-fixture.store] for CRUD storage:
```js
var fixtureStore = fixture.store([
  {id: 1, title: "One"},
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
```js
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

### ES6 use

With StealJS, you can import this module directly in a template that is autorendered:

```js
import plugin from 'can-fixture-socket';
```

### AMD use

Configure the `can` and `jquery` paths and the `can-fixture-socket` package:

```html
<script src="require.js"></script>
<script>
	require.config({
	    paths: {
	        "jquery": "node_modules/jquery/dist/jquery",
	        "can": "node_modules/canjs/dist/amd/can"
	    },
	    packages: [{
		    	name: 'can-fixture-socket',
		    	location: 'node_modules/can-fixture-socket/dist/amd',
		    	main: 'lib/can-fixture-socket'
	    }]
	});
	require(["main-amd"], function(){});
</script>
```

### Standalone use

Load the `global` version of the plugin:

```html
<script src='./node_modules/can-fixture-socket/dist/global/can-fixture-socket.js'></script>
```

## Contributing

### Making a Build

To make a build of the distributables into `dist/` in the cloned repository run

```
npm install
node build
```

### Running the tests

Tests can run in the browser by opening a webserver and visiting the `test.html` page.
Automated tests that run the tests from the command line in Firefox can be run with

```
npm test
```
