// src/socket.js
import { io, Socket } from 'socket.io-client';

// const SOCKET_URL = 'http://localhost:4000'; // Replace with your server URL
export const initSocket = (remoteUri:string) => {
    socket = io(remoteUri);
    socket.connect();
}
export let socket: Socket;