const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { connectDatabase } = require("./config/database");
const User = require("./models/user");
const cors = require("cors");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: "./config/.env" });
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  },
});

const messageQueue = new Map();

app.use(express.static("public"));
app.use(cors());
app.use(express.json());

io.use(async (socket, next) => {
  const { token } = socket.handshake.auth;
  if (!token) {
    console.log("Authentication failed: No token provided");
    socket.emit("authenticationError", {
      code: 401,
      message: "No token provided",
    });
    return next(new Error("Authentication error: No token provided"));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_ACCESS_TOKEN);
    const user = await User.findById(decoded._id);
    if (!user) {
      console.log("Authentication failed: User not found");
      socket.emit("authenticationError", {
        code: 404,
        message: "User not found",
      });
      return next(new Error("Authentication error: User not found"));
    }
    socket.user = {
      id: user._id,
      username: user.username,
      profilePic: user.imageUrl,
    };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      console.log("Authentication failed: Token has expired");
      socket.emit("authenticationError", {
        code: 403,
        message: "Token has expired",
      });
      return next(new Error("Authentication error: Token has expired"));
    }
    console.log("Authentication failed: Invalid token");
    socket.emit("authenticationError", { code: 401, message: "Invalid token" });
    next(new Error("Authentication error: Invalid token"));
  }
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.user);

  socket.emit("userDetails", {
    code: 200,
    message: "User details retrieved successfully.",
    data: {
      id: socket.user.id,
      username: socket.user.username,
      profilePic: socket.user.profilePic,
    },
  });

  socket.on("joinLecture", (lectureId) => {
    if (!lectureId) {
      console.log("Join lecture error: Missing lectureId");
      return socket.emit("error", {
        code: 400,
        message: "Missing lectureId",
      });
    }

    if (socket.rooms.has(lectureId)) {
      console.log(
        `User ${socket.user.username} is already in lecture ${lectureId}`
      );
      return socket.emit("error", {
        code: 409,
        message: `You are already in lecture ${lectureId}`,
      });
    }

    console.log(`User ${socket.user.username} joined lecture ${lectureId}`);
    socket.join(lectureId);

    // Send the last 30 messages from the message queue
    const messages = messageQueue.get(lectureId) || [];
    socket.emit("lectureMessages", {
      code: 200,
      message: "Last 30 messages retrieved successfully.",
      data: messages,
    });

    socket.emit("joinSuccess", {
      code: 200,
      message: `Successfully joined lecture ${lectureId}`,
    });
  });

  socket.on("chat message", ({ lectureId, message }) => {
    if (!lectureId) {
      console.log("Chat message error: Missing lectureId");
      return socket.emit("validationError", {
        code: 400,
        field: "lectureId",
        message: "Lecture ID is required.",
      });
    }
    if (!message) {
      console.log("Chat message error: Empty message");
      return socket.emit("validationError", {
        code: 400,
        field: "message",
        message: "Message cannot be empty.",
      });
    }

    console.log(
      `Message from ${socket.user.username} in lecture ${lectureId}: ${message}`
    );

    // Add the message to the queue
    if (!messageQueue.has(lectureId)) {
      messageQueue.set(lectureId, []);
    }
    const lectureMessages = messageQueue.get(lectureId);
    lectureMessages.push({
      userId: socket.user.id,
      username: socket.user.username,
      profilePic: socket.user.profilePic,
      message,
    });

    // Keep only the last 30 messages
    if (lectureMessages.length > 30) {
      lectureMessages.shift();
    }

    messageQueue.set(lectureId, lectureMessages);

    io.to(lectureId).emit("chat message", {
      code: 200,
      message: "Message sent successfully.",
      data: lectureMessages[lectureMessages.length - 1],
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.user.username);
  });
});

const port = process.env.PORT || 3000;

connectDatabase();
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
