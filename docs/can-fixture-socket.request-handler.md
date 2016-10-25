@typedef {function} can-fixture-socket.ack-handler Handler
@parent no parent can-fixture-socket.types


@description A handler that will be executed to handle the socket event.

```js
// Client:
socket.on("news": function handler(data, [ackCb]){
  console.log("received data", data);
  ackCb("Acknowledged", "thank you");
});

// Server:
server.emit("news", function ackFn(...data){
  console.log("Client acknowledged data receiving")
});
```

@signature `function(data, ackFn)`
@param {*} data Event data.
@param {function} [ackCb] Optional acknowledgement callback to call to let emitter know about success receiving data.
