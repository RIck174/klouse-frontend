import { io } from "socket.io-client";

// Connect to your backend server
const socket = io(import.meta.env.VITE_API_URL, {
  withCredentials: true,
});

socket.on("connect", () => console.log("Socket connected:", socket.id));

export default socket;
