import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const users = [];

function getTimeString() {
  const d = new Date(
    new Date().toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo"
    })
  );

  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

io.on("connection", socket => {

    // ===== タイマー =====
  socket.on("timerStart", data => {
    const seconds = Number(data?.seconds);

    if (!Number.isFinite(seconds) || seconds <= 0) return;

    const endTime = Date.now() + (seconds * 1000);

    io.emit("timerSync", { endTime });

    setTimeout(() => {
      io.emit("timerEnd");
    }, seconds * 1000);
  });

  socket.on("join", data => {

    const name = String(data?.name || "").trim();

    if (!name) return;

    socket.username = name;
    socket.color = data?.color || "#000000";

    users.push({
      id: socket.id,
      name: socket.username,
      color: socket.color
    });

    io.emit("userList", users);

    socket.emit("message", {
      name: "system",
      text: `${socket.username}さんが入室しました`,
      time: getTimeString()
    });
  });

  socket.on("updateColor", data => {

    socket.color = data?.color || "#000000";

    const user = users.find(
      u => u.id === socket.id
    );

    if (user) {
      user.color = socket.color;
    }

    io.emit("userList", users);
  });

    // ===== ミュート =====
  socket.on("muteUser", targetId => {
    if (!socket.mutes) {
      socket.mutes = [];
    }

    const index = socket.mutes.indexOf(targetId);

    if (index === -1) {
      socket.mutes.push(targetId);
    } else {
      socket.mutes.splice(index, 1);
    }

    const mutedNames = socket.mutes
      .map(id => users.find(u => u.id === id)?.name)
      .filter(Boolean);

    socket.emit("muteSync", mutedNames);
  });

  socket.on("message", data => {

    const text = String(data?.text || "").trim();

    if (!text) return;

    // ===== ダイス =====
    const diceMatch = text.match(/^(\d+)d(\d+)(?:\+(\d+))?$/i);

    if (diceMatch) {
      const count = Math.min(Number(diceMatch[1]), 20);
      const sides = Math.min(Number(diceMatch[2]), 10000);
      const bonus = Number(diceMatch[3] || 0);

      const rolls = Array.from(
        { length: count },
        () => Math.floor(Math.random() * sides) + 1
      );

      const total =
        rolls.reduce((sum, value) => sum + value, 0) + bonus;

      io.emit("message", {
        name: socket.username,
        text: `${count}d${sides}${bonus ? `+${bonus}` : ""} →（${rolls.join(",")}）＝${total}`,
        color: socket.color,
        time: getTimeString()
      });

      return;
    }


    // ===== 内緒話 =====
    if (data?.to) {

      const target = io.sockets.sockets.get(data.to);

      if (!target) return;

      const msg = {
        name: socket.username,
        text,
        color: socket.color,
        private: true,
        to: target.id,
        toName: target.username,
        time: getTimeString()
      };

      socket.emit("message", msg);
      target.emit("message", msg);

      return;
    }

    // ===== 通常チャット =====
    const msg = {
      name: socket.username,
      text,
      color: socket.color,
      time: getTimeString()
    };

    io.emit("message", msg);
  });

  socket.on("leave", () => {
    removeUser(socket);
  });

  socket.on("disconnect", () => {
    removeUser(socket);
  });
});

function removeUser(socket) {

  const index = users.findIndex(
    u => u.id === socket.id
  );

  if (index === -1) return;

  const name = users[index].name;

  users.splice(index, 1);

  io.emit("userList", users);

  io.emit("message", {
    name: "system",
    text: `${name}さんが退出しました`,
    time: getTimeString()
  });
}

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});