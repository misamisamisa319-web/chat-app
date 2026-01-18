import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let users = [];
let messagesLog = []; // 過去メッセージ保存用

// 女子罰・男子罰は省略（先ほどの配列そのまま）

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

let girlPunishStock = [];
let boyPunishStock = [];

function resetPunishments() {
  girlPunishStock = shuffle([...punishItems]);
  boyPunishStock  = shuffle([...boyPunishItems]);
  console.log("罰ストックをリセットしました");
}

function getGirlPunish() {
  if (girlPunishStock.length === 0) girlPunishStock = shuffle([...punishItems]);
  return girlPunishStock.shift();
}

function getBoyPunish() {
  if (boyPunishStock.length === 0) boyPunishStock = shuffle([...boyPunishItems]);
  return boyPunishStock.shift();
}

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

    // ユーザーリスト更新のみ、システムメッセージは送らない
    io.emit("userList", users);

    // 過去ログを新規入室者に送信
    socket.emit("pastMessages", messagesLog);
  });

  // メッセージ
  socket.on("message", data => {
    if (typeof data === "string") data = { name: socket.username || "anon", text: data };

    const text = data.text ?? data.message ?? "";
    const color = data.color || "black";
    const to = data.to || ""; // 内緒相手

    // 女子罰
    if (text === "女子罰") {
      const p = getGirlPunish();
      const msg = { name: socket.username, text: `女子罰 → ${p}`, type: "girl", color };
      messagesLog.push(msg);
      io.emit("message", msg);
      return;
    }

    // 男子罰
    if (text === "男子罰") {
      const p = getBoyPunish();
      const msg = { name: socket.username, text: `男子罰 → ${p}`, type: "boy", color };
      messagesLog.push(msg);
      io.emit("message", msg);
      return;
    }

    // 通常メッセージ
    const msg = { name: socket.username, text, color, to };
    messagesLog.push(msg);
    io.emit("message", msg);
  });

  // 退出（システムメッセージなし）
  socket.on("leave", () => {
    socket.disconnect(true);
  });

  // 切断
  socket.on("disconnect", () => {
    users = users.filter(u => u.id !== socket.id);
    io.emit("userList", users);

    // 全員退出で罰リセット
    if (users.length === 0) resetPunishments();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));
