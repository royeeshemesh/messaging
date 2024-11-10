// message-service.js
const express = require('express');
const Redis = require('ioredis');
const axios = require('axios');
const cors = require('cors');

const PORT = 9000;
const PRESENCE_SERVICE_URL = 'http://localhost:8000';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const redis = new Redis({
    host: 'localhost',
    port: 6379,
    maxRetriesPerRequest: null, // Set this explicitly to null for BullMQ compatibility
});

app.post('/send-read-ack', async (req, res) => {
    const { id, from, to } = req.body;
    try {
        const { data: { online: isSenderOnline, hostname: senderConnectionServiceHostname } } = await axios.get(`${PRESENCE_SERVICE_URL}/status/${to}`);
        if (isSenderOnline) {
            await axios.post(`${senderConnectionServiceHostname}/deliver-read-ack`, { id, from, to });
        }
        res.sendStatus(200);

    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }

});

// Send message to online users or queue for offline users
app.post('/send', async (req, res) => {
    const { id, from, to, message, timestamp } = req.body;

    try {
        // Check if recipient is online
        const { data: { online: isRecipientOnline, hostname: recipientConnectionServiceHostname } } = await axios.get(`${PRESENCE_SERVICE_URL}/status/${to}`);
        if (isRecipientOnline) {
            // user is online, deliver the message
            await axios.post(`${recipientConnectionServiceHostname}/deliver`, { id, from, to, timestamp, message });
            console.log(`Message from ${from} to ${to} delivered.`);

        } else {
            redis.zadd(`${to}`, timestamp, `${id}::${timestamp}::${from}::${JSON.stringify(message)}`);
            console.log(`Message from ${from} to ${to} queued.`);
        }

        // check if sender is online and send deliver ack
        const { data: { online: isSenderOnline, hostname: senderConnectionServiceHostname } } = await axios.get(`${PRESENCE_SERVICE_URL}/status/${from}`);
        if (isSenderOnline) {
            await axios.post(`${senderConnectionServiceHostname}/deliver-ack`, { id, from, to });
        } else {
        }

        res.sendStatus(200);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

// Handle user reconnection and deliver all queued messages
app.post('/online', async (req, res) => {
    const { userId, hostname } = req.body;

    // const keys = await redis.keys(`${userId}:*`);
    const keys = await redis.zrange(`${userId}`, 0, -1);
    // go over all keys and deliver the messages
    for (const key of keys) {
        const id = key.split("::")[0];
        const timestamp = key.split("::")[1];
        const from = key.split("::")[2];
        const message = key.split("::")[3];
        await axios.post(`${hostname}/deliver`, {
            id,
            to: userId,
            timestamp,
            from,
            message: JSON.parse(message),
        });
        console.log(`Message from ${from} to ${userId} delivered on reconnection.`);
        await redis.zrem(`${userId}`, key);

        // const { data: { online: isSenderOnline, hostname: senderConnectionServiceHostname } } = await axios.get(`${PRESENCE_SERVICE_URL}/status/${senderId}`);
        // await axios.post(`${senderConnectionServiceHostname}/deliver-ack`, { id, recipientId: userId, senderId });
    }

    res.sendStatus(200);
});

app.listen(PORT, () => {
    console.log(`Message Service running on port ${PORT}`);
});