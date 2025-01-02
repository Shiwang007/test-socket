const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});


app.use(express.static("public"));




// Event when a user connects
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Join a specific room based on the lecture ID
  socket.on("joinLecture", (lectureId) => {
    console.log(`User ${socket.id} joined lecture ${lectureId}`);
    socket.join(lectureId); // Join the room
  });

  // Handle chat messages
  socket.on("chat message", ({ lectureId, message }) => {
    console.log(
      `Message from ${socket.id} in lecture ${lectureId}: ${message}`
    );
    // Broadcast the message to the specific room
    io.to(lectureId).emit("chat message", { userId: socket.id, message });
  });

  // Event when a user disconnects
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Start the server
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
