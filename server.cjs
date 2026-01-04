import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let users = [];

// 罰ゲームの判定キーワード
const punishItems = ["罰ゲーム", "1", "2", "3", "4"];

io.on("connection", (socket) => {
  console.log("ユーザー接続");

  socket.on("join", ({ name }) => {
    socket.name = name;
    users.push(name);
    io.emit("userList", users);
  });

  socket.on("message", (msg) => {
    io.emit("message", msg);

    // punishItemsのどれかを含む場合に罰ゲーム表示
    if(punishItems.some(keyword => msg.text.includes(keyword))) {
      io.emit("punishment", { text: msg.text });
    }
  });

  socket.on("disconnect", () => {
    users = users.filter(u => u!==socket.name);
    io.emit("userList", users);
  });
});

server.listen(3000, () => console.log("Server running on port 3000"));
