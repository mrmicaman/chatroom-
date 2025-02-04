const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

// Initialize express app and HTTP server
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from /public folder
app.use(express.static('public'));

// Listen for connections from clients
io.on('connection', (socket) => {
  console.log('a user connected');
  
  // Handle any events from the client, e.g., messages
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

// Set the server to listen on port 3000 (or use Render's environment variable)
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
