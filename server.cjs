import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let users = [];

// 罰ゲーム5個を登録
const punishItems = [
  "1. 腕立て10回",
  "2. 変顔写真を送る",
  "3. 早口言葉を言う",
  "4. 好きな食べ物を1分間褒める",
  "5. 一言だけ替え歌を歌う"
];

io.on("connection", (socket) => {
  console.log("ユーザー接続");

  // 入室
  socket.on("join", ({ name }) => {
    socket.name = name;
    users.push(name);
    io.emit("userList", users);
  });

  // メッセージ受信
  socket.on("message", (msg) => {
    io.emit("message", msg);

    // 「罰ゲーム」と入力されたらランダムで1つ表示
    if(msg.text.includes("罰ゲーム")) {
      const randomPunish = punishItems[Math.floor(Math.random() * punishItems.length)];
      io.emit("punishment", { text: randomPunish });
    }
  });

  // 切断
  socket.on("disconnect", () => {
    users = users.filter(u => u !== socket.name);
    io.emit("userList", users);
  });
});

// サーバー起動
server.listen(3000, () => console.log("Server running on port 3000"));
