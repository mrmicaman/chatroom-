const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Store users and rooms in memory
let users = {};
let rooms = { 'School': [] }; // Permanent "School" room
let godUsers = new Set(); // Store users with god powers

// Serve static files from the "public" directory
app.use(express.static('public'));

// Handle socket connections
io.on('connection', (socket) => {
    console.log('A user connected');

    // Handle room creation
    socket.on('createRoom', (roomName, username) => {
        if (!rooms[roomName]) {
            rooms[roomName] = []; // Create room if it doesn't exist
        }
        socket.join(roomName);
        users[socket.id] = { username, roomName };

        io.to(roomName).emit('message', `${username} has joined the room.`);
        socket.emit('clearMessages');
    });

    // Handle joining a room
    socket.on('joinRoom', (roomName, username) => {
        if (!rooms[roomName]) {
            socket.emit('notification', `Room ${roomName} does not exist.`);
            return;
        }
        socket.join(roomName);
        users[socket.id] = { username, roomName };
        io.to(roomName).emit('message', `${username} has joined the room.`);
        socket.emit('clearMessages');
    });

    // Handle special commands
    socket.on('message', (msg) => {
        const { username, roomName } = users[socket.id] || {};
        if (!roomName) return;

        if (msg.startsWith('/micaisking')) {
            godUsers.add(socket.id);
            socket.emit('notification', 'You have activated god powers!');
            return;
        }

        if (godUsers.has(socket.id)) {
            if (msg.startsWith('/announce ')) {
                const announcement = msg.replace('/announce ', '');
                io.emit('message', `[ANNOUNCEMENT] ${username}: ${announcement}`);
                return;
            }
            if (msg.startsWith('/spam ')) {
                const parts = msg.split(' ');
                const word = parts[1];
                const count = parseInt(parts[2]);
                if (word && count && count > 0 && count <= 10) {
                    for (let i = 0; i < count; i++) {
                        io.to(roomName).emit('message', `${username}: ${word}`);
                    }
                }
                return;
            }
            if (msg.startsWith('/resetname ')) {
                const newName = msg.replace('/resetname ', '').trim();
                if (newName) {
                    users[socket.id].username = newName;
                    socket.emit('notification', `Your name has been changed to ${newName}.`);
                }
                return;
            }
            if (msg.startsWith('/globalnames')) {
                const allNames = Object.values(users).map(user => user.username).join(', ');
                socket.emit('notification', `All active users: ${allNames}`);
                return;
            }
            if (msg.startsWith('/listrooms')) {
                const allRooms = Object.keys(rooms).join(', ');
                socket.emit('notification', `Available rooms: ${allRooms}`);
                return;
            }
            if (msg.startsWith('/mute ')) {
                const targetUser = msg.replace('/mute ', '').trim();
                // Muting logic can be expanded, currently just notifying
                io.to(roomName).emit('message', `${username} has muted ${targetUser}.`);
                return;
            }
            if (msg.startsWith('/kick ')) {
                const targetUser = msg.replace('/kick ', '').trim();
                const targetSocket = Object.keys(users).find(id => users[id].username === targetUser);
                if (targetSocket) {
                    io.sockets.sockets.get(targetSocket)?.disconnect();
                    io.to(roomName).emit('message', `${username} has kicked ${targetUser} from the server.`);
                }
                return;
            }
        }

        io.to(roomName).emit('message', `${username}: ${msg}`);
    });

    // Handle leaving a room
    socket.on('leaveRoom', () => {
        const { username, roomName } = users[socket.id] || {};
        if (roomName) {
            socket.leave(roomName);
            io.to(roomName).emit('message', `${username} has left the room.`);
            delete users[socket.id];
            if (roomName !== 'School' && io.sockets.adapter.rooms.get(roomName)?.size === 0) {
                delete rooms[roomName]; // Delete empty rooms (except School)
            }
        }
    });

    // Handle user disconnecting
    socket.on('disconnect', () => {
        console.log('A user disconnected');
        const { username, roomName } = users[socket.id] || {};
        if (roomName) {
            io.to(roomName).emit('message', `${username} has disconnected.`);
            delete users[socket.id];
        }
    });
});

// Start the server on port 3000
server.listen(process.env.PORT || 3000, () => {
    console.log('Server is running');
});
