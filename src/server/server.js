const express = require('express');

const app = express();
const path = require('path');
const server = require('http').Server(app);
/* const io = require('socket.io')(server); */

const port = process.env.PORT || 8080;

app.use(express.static(path.join(__dirname, '../../build')));
/*
function onConnection(socket) {
  console.log(`Connection from: ${socket.id}`);
  socket.on('drawing', data => socket.broadcast.emit('drawing', data));
}

io.on('connection', onConnection); */

server.listen(port, (error) => {
  if (error) {
    console.log(error);
  } else {
    console.log(`Listening on port ${port}!`);
    console.log(`Path: ${__dirname}`);
  }
});
