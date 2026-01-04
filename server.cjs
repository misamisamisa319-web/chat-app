import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let users = [];

io.on("connection", (socket) => {
  console.log("ユーザー接続");

  socket.on("join", ({ name }) => {
    socket.name = name;
    users.push(name);
    io.emit("userList", users);
  });

  socket.on("message", (msg) => {
    io.emit("message", msg);

    // 罰ゲームコマンド: "/punish <内容>"
    if(msg.text.startsWith("/punish ")) {
      const text = msg.text.replace("/punish ","");
      io.emit("punishment", { text });
    }
  });

  socket.on("disconnect", () => {
    users = users.filter(u => u!==socket.name);
    io.emit("userList", users);
  });
});

server.listen(3000, () => console.log("Server running on port 3000"));
