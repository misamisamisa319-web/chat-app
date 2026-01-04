import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let users = [];
const punishItems = ["1", "2", "3", "4", "5"]; // 罰ゲーム

io.on("connection", (socket) => {
  console.log("ユーザー接続");

  socket.on("join", ({ name }) => {
    users.push({ id: socket.id, name });
    io.emit("userList", users);
  });

  socket.on("leave", ({ name }) => {
    users = users.filter(u => u.id !== socket.id);
    io.emit("userList", users);
  });

  socket.on("message", (msg) => {
    if(msg.text === "罰ゲーム") {
      const randomPunish = punishItems[Math.floor(Math.random() * punishItems.length)];
      io.emit("punishment", { text: randomPunish });
    } else {
      io.emit("message", msg);
    }
  });

  socket.on("disconnect", () => {
    users = users.filter(u => u.id !== socket.id);
    io.emit("userList", users);
  });
});

server.listen(3000, () => console.log("Server running on port 3000"));

