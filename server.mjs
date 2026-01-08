import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let users = [];
// 罰ゲーム30個
const punishItems = [
  "罰1", "罰2", "罰3", "罰4", "罰5",
  "罰6", "罰7", "罰8", "罰9", "罰10",
  "罰11", "罰12", "罰13", "罰14", "罰15",
  "罰16", "罰17", "罰18", "罰19", "罰20",
  "罰21", "罰22", "罰23", "罰24", "罰25",
  "罰26", "罰27", "罰28", "罰29", "罰30"
];

// 接続
io.on("connection", socket => {
  console.log("接続:", socket.id);

  // 入室
  socket.on("join", ({ name }) => {
    socket.username = name;
    if (!users.find(u => u.name === name)) {
      users.push({ id: socket.id, name });
    } else {
      let i = 2;
      let newName = name + i;
      while (users.find(u => u.name === newName)) i++, newName = name + i;
      socket.username = newName;
      users.push({ id: socket.id, name: newName });
    }

    io.emit("userList", users);
    io.emit("system", `${socket.username} が入室しました`);

    // 入室時に罰ゲーム30個を送信
    punishItems.forEach((item, index) => {
      socket.emit("updatePunish", { index, text: item });
    });
  });

  // メッセージ
  socket.on("message", data => {
    if (typeof data === "string") data = { name: socket.username || "anon", text: data };
    const text = data.text ?? data.message ?? data;

    // 罰ゲーム判定（ランダム1個表示）
    if (text === "罰ゲーム") {
      const randomIndex = Math.floor(Math.random() * punishItems.length);
      const p = punishItems[randomIndex];
      io.emit("system", `罰ゲーム: ${p}`);
    }

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
