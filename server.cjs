import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const punishments = [
  "腕立て伏せ10回",
  "変顔で写真を撮る",
  "次の発言を敬語で話す",
  "10秒間無言",
  "好きな食べ物を発表する"
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
