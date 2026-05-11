import { io } from "socket.io-client";

// Connect to your backend server
const socket = io("http://localhost:5000", {
  withCredentials: true,
});

socket.on("connect", () => console.log("Socket connected:", socket.id));

export default socket;
