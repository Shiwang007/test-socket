const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Replace "*" with specific domains for better security
    methods: ["GET", "POST"],
  },
});

// Use CORS middleware for all routes
app.use(cors());

// Serve static files
app.use(express.static("public"));

// WebSocket events
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinLecture", (lectureId) => {
    console.log(`User ${socket.id} joined lecture ${lectureId}`);
    socket.join(lectureId);
  });

  socket.on("chat message", ({ lectureId, message }) => {
    console.log(
      `Message from ${socket.id} in lecture ${lectureId}: ${message}`
    );
    io.to(lectureId).emit("chat message", { userId: socket.id, message });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Start the server
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
