[![Build Status](https://travis-ci.org/canjs/can-fixture-socket.png?branch=master)](https://travis-ci.org/canjs/can-fixture-socket)

# can-fixture-socket

Intercepts socket.io connection and allows to simulate socket.io server behaviour.

Full documentation is available here: [http://canjs.github.io/canjs/doc/can-fixture-socket.html](http://canjs.github.io/canjs/doc/can-fixture-socket.html).

The `can-fixture-socket` module exports an object with:

- **Server**, a constructor function which instance intercepts a socket.io connection.
- **requestHandlerToListener**, a helper to convert XHR request handler into [socket event listener](http://canjs.github.io/canjs/doc/can-fixture-socket.socket-event-listener.html). This is useful when using [can-fixture.store](http://canjs.github.io/canjs/doc/can-fixture.store.html) module.
- **storeToListeners**, a helper to convert all [can-fixture.store](http://canjs.github.io/canjs/doc/can-fixture.store.html) request handlers into socket event listeners.

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

Lets say we wanted to test a simple app that connects to `socket.io`, and
once connected, creates a message, and logs when the message is created.

That app could look like the following:

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

To test this, we'll first use [can-fixture-socket.Server](http://canjs.github.io/canjs/doc/can-fixture-socket.Server.html) to intercept the socket connection:

```js
var io = require("socket.io-client");
var fixtureSocket = require("can-fixture-socket");
var mockServer = new fixtureSocket.Server(io);
```

Now we can mock the socket server by creating socket event listeners and emitting socket events:

```js
mockServer.on("messages create", function(data){
  console.log("New message received", data);
  mockServer.emit("message created", data);
});
```

#### Acknowledgement callbacks

We also can use socket.io [acknowledgement callbacks](http://socket.io/docs/#sending-and-getting-data-(acknowledgements)):
```js
mockServer.on("users create", function(user, ackCb){
  console.log("Simulating saving a new user to DB and return the new user id", user);

  ackCB({
    id: Math.random()
  });
});
```

Client code:

```js
var socket = io();
socket.on("connect", function(){
  socket.emit("users create", {name: "Ilya", likes: "skiing"}, function (data) {
    // data is what server calls the acknowledgement callback
    // with (e.g. data.id is the new user id).
    console.log(data.id);
  });
});
```

### Use with can-fixture.Store

With can-fixture [can-fixture.store](http://canjs.github.io/canjs/doc/can-fixture.store.html) we can create a store of items and emulate a fully working CRUD service. Optionally, we can use [can-set.Algebra](http://canjs.github.io/canjs/doc/can-set.html) to power our store filtering, pagination, and sorting abilities.

```js
// Import can-fixture that provides `store` method for creating a store:
var fixture = require("can-fixture");
var canSet = require("can-set");

// Create a fixture store:
var messagesStore = fixture.store([
  {id: 1, title: "One"},
  {id: 2, title: "Two"},
  {id: 3, title: "Three"}
], new canSet.Algebra({}));
```

We can mock the socket.io connection with the rich behavior of _fixture stores_ using the [requestHandlerToListener](http://canjs.github.io/canjs/doc/can-fixture-socket.requestHandlerToListener.html) helper.  The `requestHandlerToListener` function
converts a _fixture store request handler_ (e.g. [getListData](http://canjs.github.io/canjs/doc/can-fixture/StoreType.prototype.getListData.html)) to a _[socket.io event listener](http://canjs.github.io/canjs/doc/can-fixture-socket.socket-event-listener.html)_.

```js
var fixtureSocket = require("can-fixture-socket");
var io = require("socket.io-client");
var mockServer = new fixtureSocket.Server(io);

var toListener = fixtureSocket.requestHandlerToListener;
mockServer.on("messages get", toListener( messagesStore.getData ));
```

Or we can use [storeToListeners](http://canjs.github.io/canjs/doc/can-fixture-socket.storeToListeners.html) helper to convert all CRUD _fixture store request handlers_ into _socket.io event listeners_:

```js
var listeners = fixtureSocket.storeToListeners( messagesStore );
mockServer.on({
  "messages remove": listeners.destroyData,
  "messages create": listeners.createData,
  "messages update": listeners.updateData
});
```

### Use with FeathersJS

[FeathersJS](http://feathersjs.com/) is a minimalist, service-oriented, real-time web framework for modern applications. It is a NodeJS framework built on top of Express. It allows you to build REST-ful services and works with three [providers](https://docs.feathersjs.com/providers/): standard HTTP communication, WebSockets and Primus.

The mocked server exposes [onFeathersService](http://canjs.github.io/canjs/doc/can-fixture-socket.Server.prototype.onFeathersService.html) method to simulate [FeathersJS](http://feathersjs.com/) CRUD services.

For example, given the following FeathersJS client app:

```js
var socket = io("http://api.my-feathers-server.com");
var app = feathers()
	.configure(hooks())
	.configure(feathersSocketio(socket));

// Create FeathersJS CRUD service for "messages" resource:
var messagesService = app.service("messages");
```

We can simulate it with a [can-fixture.store](http://canjs.github.io/canjs/doc/can-fixture.store.html) as follows:

```js
var messagesStore = fixture.store([
  {id: 1, title: "One"},
  {id: 2, title: "Two"},
  {id: 3, title: "Three"}
], new canSet.Algebra({}));

mockServer.onFeathersService("messages", fixtureStore);
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
