import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import { Socket } from "socket.io";
import { io } from "./lib/socket.js";

import path from "path";

import { connectDB } from "./lib/db.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { app, server } from "./lib/socket.js";

dotenv.config();

const PORT = process.env.PORT;
const __dirname = path.resolve();

app.use(express.json({limit:"50mb"}));
app.use(express.urlencoded({ extended: true, limit: "50mb" })); // URL-encoded parser

app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}
let users = {};

io.on("connection", (socket) => {
  console.log("A user connected");

  // Add new user to the connected users list
  socket.on("register", (userId) => {
    users[userId] = socket.id;
    console.log(`User registered: ${userId}`);
  });

  // Send video call signal to the receiver
  socket.on("call-user", (data) => {
    const { to, from, signalData } = data;
    if (users[to]) {
      io.to(users[to]).emit("incoming-call", { from, signalData });
    }
  });

  // Receive the call accepted signal
  socket.on("accept-call", (data) => {
    const { to, signalData } = data;
    if (users[to]) {
      io.to(users[to]).emit("call-accepted", { signalData });
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

server.listen(PORT, () => {
  console.log("server is running on PORT:" + PORT);
  connectDB();
});

