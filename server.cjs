const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

io.on("connection", socket => {
  socket.on("join", name => {
    socket.username = name;
    socket.broadcast.emit("system", `${name} さんが入室しました`);
  });

  socket.on("chat", data => {
    io.emit("chat", data);
  });

  socket.on("disconnect", () => {
    if (socket.username) {
      socket.broadcast.emit("system", `${socket.username} さんが退出しました`);
    }
  });
});

server.listen(3000, () => {
  console.log("サーバー起動 http://localhost:3000");
});
