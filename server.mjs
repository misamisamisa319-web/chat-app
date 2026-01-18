import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let users = [];
let messagesLog = [];

// 女子罰と男子罰
const punishItems = ["女子罰1", "女子罰2", "女子罰3"]; // 省略版
const boyPunishItems = ["男子罰1", "男子罰2", "男子罰3"]; // 省略版

function shuffle(array) { return array.sort(() => Math.random() - 0.5); }

let girlPunishStock = shuffle([...punishItems]);
let boyPunishStock = shuffle([...boyPunishItems]);

function getGirlPunish() {
  if (girlPunishStock.length === 0) girlPunishStock = shuffle([...punishItems]);
  return girlPunishStock.shift();
}

function getBoyPunish() {
  if (boyPunishStock.length === 0) boyPunishStock = shuffle([...boyPunishItems]);
  return boyPunishStock.shift();
}

function resetPunishments() {
  girlPunishStock = shuffle([...punishItems]);
  boyPunishStock = shuffle([...boyPunishItems]);
  console.log("罰ストックをリセットしました");
}

io.on("connection", socket => {
  console.log("接続:", socket.id);

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
    socket.emit("pastMessages", messagesLog); // 過去ログ送信
    // 入室のsystemメッセージは非表示にする場合コメントアウト
    // io.emit("system", `${socket.username} が入室しました`);
  });

  socket.on("message", data => {
    const text = data.text ?? "";
    // 女子罰
    if (text === "女子罰") {
      const p = getGirlPunish();
      const msg = { name: socket.username, text: `女子罰 → ${p}`, type: "girl", color: "red" };
      messagesLog.push(msg);
      io.emit("message", msg);
      return;
    }
    // 男子罰
    if (text === "男子罰") {
      const p = getBoyPunish();
      const msg = { name: socket.username, text: `男子罰 → ${p}`, type: "boy", color: "blue" };
      messagesLog.push(msg);
      io.emit("message", msg);
      return;
    }

    const msg = { name: data.name || socket.username, text, color: data.color || "black" };
    messagesLog.push(msg);
    io.emit("message", msg);
  });

  socket.on("leave", () => {
    socket.disconnect(true);
  });

  socket.on("disconnect", () => {
    users = users.filter(u => u.id !== socket.id);
    io.emit("userList", users);
    // 退出のsystemメッセージは非表示にする場合コメントアウト
    // if (socket.username) io.emit("system", `${socket.username} が退出しました`);
    if (users.length === 0) resetPunishments();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));
