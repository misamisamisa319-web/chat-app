const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const punishments = [
  "下着の上からクリスリスリ",
  "乳首をカリカリ３分",
  "クリをスリスリ３分",
  "寸止め１回",
  "全力オナニーで絶頂する"
];

io.on("connection", socket => {

  socket.on("join", name => {
    socket.name = name;
    socket.broadcast.emit("system", `${name} が入室しました`);
  });

  socket.on("chat", data => {
    // 👇 罰ゲームコマンド判定
    if (data.msg.trim() === "罰ゲーム") {
      const p = punishments[Math.floor(Math.random() * punishments.length)];
      socket.emit("system", `🎯 罰ゲーム：${p}`);
      return;
    }

    io.emit("chat", data);
  });

  socket.on("disconnect", () => {
    if (socket.name) {
      socket.broadcast.emit("system", `${socket.name} が退出しました`);
    }
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log("Server started");
});
