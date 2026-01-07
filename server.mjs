import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let users = [];
const punishItems = ["腕立て10回", "スクワット20回", "一発ギャグ", "変顔10秒", "歌う"];

io.on("connection", socket => {
  console.log("接続:", socket.id);

  socket.on("join", ({ name }) => {
    socket.username = name;
    users.push({ id: socket.id, name });
    io.emit("userList", users);
    io.emit("system", `${name} が入室しました`);
  });

 socket.on("message", data => {
  // 文字列で送られてきた場合も安全に変換
  if (typeof data === "string") {
    data = { name: socket.username || "anon", text: data };
  }

  console.log("受信:", data);

  const text = data.text ?? data.message ?? data;

  // 罰ゲーム処理
  if (text === "罰ゲーム") {
    const p = punishItems[Math.floor(Math.random() * punishItems.length)];
    io.emit("system", `罰ゲーム: ${p}`);
  }

  // 通常メッセージ送信
  io.emit("message", { name: socket.username || "anon", text });
});


  socket.on("leave", () => {
    users = users.filter(u => u.id !== socket.id);
    io.emit("userList", users);
    if (socket.username) io.emit("system", `${socket.username} が退出しました`);
  });

  socket.on("disconnect", () => {
    users = users.filter(u => u.id !== socket.id);
    io.emit("userList", users);
    if (socket.username) io.emit("system", `${socket.username} が切断されました`);
  });
});

server.listen(3000, () => console.log("Server running on 3000"));
