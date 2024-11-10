// presence-service.js
const express = require('express');
const Redis = require('ioredis');
const cors = require('cors');
const axios = require('axios');

const PORT = 8000;
const MESSAGE_SERVICE_URL = 'http://localhost:9000';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const redis = new Redis();

// Register user as online
app.post('/register-user', async (req, res) => {
    const { userId, hostname } = req.body;
    await redis.set(`presence:${userId}`, hostname);

    // Notify Message Service that the user is online
    await axios.post(`${MESSAGE_SERVICE_URL}/online`, { userId, hostname });

    res.sendStatus(200);
    console.log(`User ${userId} is online at ${hostname}`);
});

// Mark user as offline
app.post('/disconnect', async (req, res) => {
    const { userId } = req.body;
    await redis.del(`presence:${userId}`);
    res.sendStatus(200);
    console.log(`User ${userId} went offline`);
});

// Get user presence status
app.get('/status/:userId', async (req, res) => {
    const userId = req.params.userId;
    const hostname = await redis.get(`presence:${userId}`);
    res.json({ online: !!hostname, hostname });
});

app.listen(PORT, () => {
    console.log(`Presence Service running on port ${PORT}`);
});