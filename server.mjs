import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let users = [];
const punishItems = ["腕立て10回", "スクワット20回", "一発ギャグ", "変顔10秒", "歌う"];

// 接続
io.on("connection", socket => {
  console.log("接続:", socket.id);

  // 入室
  socket.on("join", ({ name }) => {
    socket.username = name;

    // 名前重複防止
    if (!users.find(u => u.name === name)) {
      users.push({ id: socket.id, name });
    } else {
      // 重複なら番号をつける
      let i = 2;
      let newName = name + i;
      while (users.find(u => u.name === newName)) i++, newName = name + i;
      socket.username = newName;
      users.push({ id: socket.id, name: newName });
    }

    io.emit("userList", users);
    io.emit("system", `${socket.username} が入室しました`);
  });

  // メッセージ
  socket.on("message", data => {
    // 文字列なら変換
    if (typeof data === "string") data = { name: socket.username || "anon", text: data };

    const text = data.text ?? data.message ?? data;

    // 罰ゲーム判定
    if (text === "罰ゲーム") {
      const p = punishItems[Math.floor(Math.random() * punishItems.length)];
      io.emit("system", `罰ゲーム: ${p}`);
    }

    // 安全に送信
    io.emit("message", { name: data.name || socket.username || "anon", text });
    console.log("受信:", { name: data.name || socket.username || "anon", text });
  });

  // 退出
  socket.on("leave", () => {
    users = users.filter(u => u.id !== socket.id);
    io.emit("userList", users);
    if (socket.username) io.emit("system", `${socket.username} が退出しました`);
  });

  // 切断
  socket.on("disconnect", () => {
    users = users.filter(u => u.id !== socket.id);
    io.emit("userList", users);
    if (socket.username) io.emit("system", `${socket.username} が切断されました`);
  });
});

// サーバー起動
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));
