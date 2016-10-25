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

### CRUD service with NodeJS style acknowledgement handlers

