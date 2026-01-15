import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const users = [];

// 女子罰（ダミー）
const girlPunish = [
  "女子罰1",
  "女子罰2",
  "女子罰3",
  "女子罰4",
  "女子罰5",
];

// 男子罰（30個ダミー）
const boyPunish = [
  "男子罰1","男子罰2","男子罰3","男子罰4","男子罰5",
  "男子罰6","男子罰7","男子罰8","男子罰9","男子罰10",
  "男子罰11","男子罰12","男子罰13","男子罰14","男子罰15",
  "男子罰16","男子罰17","男子罰18","男子罰19","男子罰20",
  "男子罰21","男子罰22","男子罰23","男子罰24","男子罰25",
  "男子罰26","男子罰27","男子罰28","男子罰29","男子罰30",
];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

io.on("connection", (socket) => {
  console.log("接続:", socket.id);

  socket.on("join", (name) => {
    users.push({ id: socket.id, name });
    io.emit("system", `${name} さんが入室しました`);
  });

  socket.on("message", (msg) => {
    io.emit("message", msg);
  });

  socket.on("girlPunish", () => {
    const p = randomFrom(girlPunish);
    io.emit("system", `女子罰: ${p}`);
  });

  socket.on("boyPunish", () => {
    const p = randomFrom(boyPunish);
    io.emit("system", `男子罰: ${p}`);
  });

  socket.on("disconnect", () => {
    const index = users.findIndex(u => u.id === socket.id);
    if (index !== -1) {
      const name = users[index].name;
      users.splice(index, 1);
      io.emit("system", `${name} さんが退室しました`);
    }
  });
});

server.listen(process.env.PORT || 10000, () => {
  console.log("Server running");
});
