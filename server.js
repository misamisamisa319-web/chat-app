const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

io.on("connection", socket => {
  socket.on("join", name => {
    socket.name = name;
    io.emit("system", `${name} が入室しました`);
  });

  socket.on("chat", data => {
    io.emit("chat", data);
  });

  socket.on("disconnect", () => {
    if (socket.name) {
      io.emit("system", `${socket.name} が退出しました`);
    }
  });
});

server.listen(3000, () => {
  console.log("http://localhost:3000 で起動中");
});
