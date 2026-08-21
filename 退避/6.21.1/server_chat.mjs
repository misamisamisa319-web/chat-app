import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const users = [];


// ===== 女性用・男性用 命令リスト =====


const toyCommands = [
  "玩具用1.",
  "玩具用2.",
  "玩具用3.",
  "玩具用4.",
  "玩具用5.",
  "玩具用6.",
  "玩具用7.",
  "玩具用8.",
  "玩具用9.",
  "玩具用10.",
  "玩具用11.",
  "玩具用12.",
  "玩具用13.",
  "玩具用14.",
  "玩具用15.",
  "玩具用16.",
  "玩具用17.",
  "玩具用18.",
  "玩具用19.",
  "玩具用20.",
  "玩具用21.",
  "玩具用22.",
  "玩具用23.",
  "玩具用24.",
  "玩具用25.",
  "玩具用26.",
  "玩具用27.",
  "玩具用28.",
  "玩具用29.",
  "玩具用30."
];

const girlCommands = [
  "女子用1.",
  "女子用2.",
  "女子用3.",
  "女子用4.",
  "女子用5.",
  "女子用6.",
  "女子用7.",
  "女子用8.",
  "女子用9.",
  "女子用10.",
  "女子用11.",
  "女子用12.",
  "女子用13.",
  "女子用14.",
  "女子用15.",
  "女子用16.",
  "女子用17.",
  "女子用18.",
  "女子用19.",
  "女子用20.",
  "女子用21.",
  "女子用22.",
  "女子用23.",
  "女子用24.",
  "女子用25.",
  "女子用26.",
  "女子用27.",
  "女子用28.",
  "女子用29.",
  "女子用30."
];

const boyCommands = [
  "男性用1.",
  "男性用2.",
  "男性用3.",
  "男性用4.",
  "男性用5.",
  "男性用6.",
  "男性用7.",
  "男性用8.",
  "男性用9.",
  "男性用10.",
  "男性用11.",
  "男性用12.",
  "男性用13.",
  "男性用14.",
  "男性用15.",
  "男性用16.",
  "男性用17.",
  "男性用18.",
  "男性用19.",
  "男性用20.",
  "男性用21.",
  "男性用22.",
  "男性用23.",
  "男性用24.",
  "男性用25.",
  "男性用26.",
  "男性用27.",
  "男性用28.",
  "男性用29.",
  "男性用30."
];

const partyCommands = [
  "パーティー1.",
  "パーティー2.",
  "パーティー3.",
  "パーティー4.",
  "パーティー5.",
  "パーティー6.",
  "パーティー7.",
  "パーティー8.",
  "パーティー9.",
  "パーティー10.",
  "パーティー11.",
  "パーティー12.",
  "パーティー13.",
  "パーティー14.",
  "パーティー15.",
  "パーティー16.",
  "パーティー17.",
  "パーティー18.",
  "パーティー19.",
  "パーティー20.",
  "パーティー21.",
  "パーティー22.",
  "パーティー23.",
  "パーティー24.",
  "パーティー25.",
  "パーティー26.",
  "パーティー27.",
  "パーティー28.",
  "パーティー29.",
  "パーティー30."
];



// ===== 命令抽選ストック =====

let girlCommandStock = [];

let boyCommandStock = [];

let toyCommandStock = [];

let partyCommandStock = [];

function getGirlCommand() {

  if (girlCommandStock.length === 0) {

    girlCommandStock = shuffle([...girlCommands]);

  }

  return girlCommandStock.shift();

}

function getBoyCommand() {

  if (boyCommandStock.length === 0) {

    boyCommandStock = shuffle([...boyCommands]);

  }

  return boyCommandStock.shift();

}

function getToyCommand() {

  if (toyCommandStock.length === 0) {

    toyCommandStock = shuffle([...toyCommands]);

  }

  return toyCommandStock.shift();

}

function getPartyCommand() {

  if (partyCommandStock.length === 0) {

    partyCommandStock = shuffle([...partyCommands]);

  }

  return partyCommandStock.shift();

}

function shuffle(array) {

  return array.sort(() => Math.random() - 0.5);

}


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

    // ===== 命令 =====

if (text === "玩具用") {
  const command = getToyCommand();

  io.emit("message", {
    name: socket.username,
    text: command,
    color: "purple",
    time: getTimeString()
  });

  return;
}    

if (text === "命令女") {
  const command = getGirlCommand();

  io.emit("message", {
    name: socket.username,
    text: command,
    color: "deeppink",
    time: getTimeString()
  });

  return;
}

if (text === "命令男") {
  const command = getBoyCommand();

  io.emit("message", {
    name: socket.username,
    text: command,
    color: "navy",
    time: getTimeString()
  });

  return;
}

if (text === "パーティー") {
  const command = getPartyCommand();

  io.emit("message", {
    name: socket.username,
    text: command,
    color: "orange",
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