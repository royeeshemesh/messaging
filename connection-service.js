// connection-service.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
const cors = require('cors');

const args = process.argv.slice(2);
if (args.length !== 1) {
    console.error('Usage: node connection-service.js <PORT>');
    process.exit(1);
}
const PORT = parseInt(args[0]);

const hostname = `http://localhost:${PORT}`;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
    },
});

// Base URLs for other services
const PRESENCE_SERVICE_URL = 'http://localhost:8000';
const MESSAGE_SERVICE_URL = 'http://localhost:9000';

// Track active socket connections for each user
let userConnections = {};

// Handle WebSocket connections
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Register user and notify Presence Service
    socket.on('register', async (userId) => {
        userConnections[userId] = socket.id;  // Store the socket ID for the user
        await axios.post(`${PRESENCE_SERVICE_URL}/register-user`, {
            userId,
            hostname,
        });
        console.log(`User ${userId} registered with socket ID ${socket.id} at ${hostname}`);
    });

    // Handle disconnection and notify Presence Service
    socket.on('disconnect', async () => {
        for (const [userId, socketId] of Object.entries(userConnections)) {
            if (socketId === socket.id) {
                delete userConnections[userId];  // Remove the user's socket ID
                await axios.post(`${PRESENCE_SERVICE_URL}/disconnect`, { userId });
                console.log(`User ${userId} disconnected`);
            }
        }
    });

    // Handle sending messages through Message Service
    socket.on('send_message', async ({ id, from, to, timestamp, message }) => {
        try {
            await axios.post(`${MESSAGE_SERVICE_URL}/send`, {
                id,
                from,
                to,
                timestamp,
                message,
            });
        } catch (error) {
            console.error(error?.response?.data || error.message);
        }
    });

    socket.on('read_ack', async ({ id, from, to }) => {
        try {
            await axios.post(`${MESSAGE_SERVICE_URL}/send-read-ack`, {
                id,
                from,
                to,
            });
        } catch (error) {
            console.error(error?.response?.data || error.message);
        }
    });



    // Endpoint to receive and deliver messages from Message Service
    app.post('/deliver', (req, res) => {
        const { from, to, timestamp, message, id } = req.body;
        const toSocketId = userConnections[to];
        if (toSocketId) {
            io.to(toSocketId).emit('message', { id, timestamp, from, message });
        }
        res.sendStatus(200);
    });

    app.post('/deliver-ack', (req, res) => {
        const { from, id, to } = req.body;
        const fromSocketId = userConnections[from];
        if (fromSocketId) {
            io.to(fromSocketId).emit('message_ack', { id, to });
        }
        res.sendStatus(200);
    });


    app.post('/deliver-read-ack', (req, res) => {
        const { from, id, to } = req.body;
        const toSocketId = userConnections[to];
        if (toSocketId) {
            io.to(toSocketId).emit('message_read_ack', { id, to: from });
        }
        res.sendStatus(200);
    });
});

server.listen(PORT, () => {
    console.log(`Connection Service running on port ${PORT}`);

});