import express from "express";
import http from "http";
import { Server } from "socket.io";
import fs from "fs";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let users = [];
let messagesLog = [];

// ===== 電気椅子部屋の役割管理 =====
const denkiState = {
  players: [] // socket.id を最大2つ
};

const LOG_FILE = "./logs.json";

if (fs.existsSync(LOG_FILE)) {
  try {
    messagesLog = JSON.parse(fs.readFileSync(LOG_FILE, "utf8"));
  } catch {
    messagesLog = [];
  }
}

function saveLogs() {
  fs.writeFileSync(LOG_FILE, JSON.stringify(messagesLog, null, 2));
}

app.use(express.static("public"));


// ===== 管理者用ログ =====
app.get("/admin", (req, res) => {
  const key = req.query.key;
  if (key !== process.env.ADMIN_KEY) {
    return res.status(403).send("Forbidden");
  }

  const rows = messagesLog.map(m => `
    <tr>
      <td>${m.time || ""}</td>
      <td>${m.room}</td>
      <td>${m.name}</td>
      <td>${m.private ? "内緒" : "通常"}</td>
      <td>${m.text}</td>
    </tr>
  `).join("");

  res.send(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8" />
      <title>管理者ログ</title>
      <style>
        body { font-family: sans-serif; padding: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 6px; }
        th { background: #f0f0f0; }
      </style>
    </head>
    <body>
      <h2>管理者ログ</h2>
      <table>
        <tr>
          <th>時刻</th>
          <th>部屋</th>
          <th>名前</th>
          <th>種別</th>
          <th>内容</th>
        </tr>
        ${rows}
      </table>
    </body>
    </html>
  `);
});

// ===== ロビー情報 =====
function getLobbyInfo() {
  const rooms = {};
  users.forEach(u => {
    if (!rooms[u.room]) rooms[u.room] = { count: 0, names: [] };
    rooms[u.room].count++;
    rooms[u.room].names.push(u.name);
  });
  return rooms;
}

// ===== 個室鍵 =====
const roomKeys = {
  privateA: "1234a",
  privateB: "1234b",
  privateC: "1234c",
  privateD: "1234d",
};

// ===== 時刻 =====
function getTimeString() {
  const d = new Date(
    new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
  );
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

// ===== 15分無反応切断 =====
const LIMIT = 15 * 60 * 1000;
function updateActive(socket){
  const u = users.find(x=>x.id===socket.id);
  if(u) u.lastActive = Date.now();
}
setInterval(()=>{
  const now = Date.now();
  users.forEach(u=>{
    if(now - (u.lastActive ?? now) > LIMIT){
      const s = io.sockets.sockets.get(u.id);
      if(s){
        s.emit("message", {
          name:"system",
          text:"15分間反応がなかったため切断されました",
          room:u.room,
          time:getTimeString()
        });
        s.disconnect(true);
      }
    }
  });
}, 60000);

// ===== 接続 =====
io.on("connection", socket => {

  // 鍵チェック
  socket.on("checkRoomKey", ({ room, key }) => {
    if (roomKeys[room] && key !== roomKeys[room]) {
      socket.emit("checkResult", { ok:false, message:"鍵が違います" });
      return;
    }
    const privateRooms = ["privateA","privateB","privateC","privateD"];
    if (privateRooms.includes(room)) {
      const r = io.sockets.adapter.rooms.get(room);
      if (r && r.size >= 2) {
        socket.emit("checkResult", { ok:false, message:"この個室は満室です" });
        return;
      }
    }
    socket.emit("checkResult", { ok:true });
  });

  // 入室
  socket.on("join", ({ name, color="black", room="room1" }) => {
    socket.username = name;
    socket.room = room;
    socket.join(room);

    users.push({
      id: socket.id,
      name,
      color,
      room,
      lastActive: Date.now()
    });

    io.to(room).emit("userList", users.filter(u=>u.room===room));
    socket.emit("pastMessages", messagesLog.filter(m=>m.room===room));
    io.emit("lobbyUpdate", getLobbyInfo());

    // 電気椅子：役割
    if (room === "denki") {
      if (!denkiState.players.includes(socket.id) && denkiState.players.length < 2) {
        denkiState.players.push(socket.id);
      }

      const role =
        denkiState.players[0] === socket.id ? "player1" :
        denkiState.players[1] === socket.id ? "player2" :
        "viewer";

      socket.emit("denkiRole", role);
    }
  });

  // 電気椅子：着席
  socket.on("denkiSelect", seat => {
    if (socket.room !== "denki") return;

    io.to("denki").emit("message", {
      name: "⚡ 電気椅子",
      text: `🪑 ${seat}番の椅子に座りました`,
      color: "orange",
      room: "denki",
      time: getTimeString()
    });
  });

  // 電気椅子：通電
  socket.on("denkiFire", () => {
    if (socket.room !== "denki") return;

    const seat = Math.floor(Math.random() * 12) + 1;
    const hit = Math.random() < 0.3;

    io.to("denki").emit("message", {
      name: "⚡ 電気椅子",
      text: hit
        ? `💥 ${seat}番の椅子に電流！`
        : `😌 ${seat}番の椅子…セーフ`,
      color: hit ? "red" : "green",
      room: "denki",
      time: getTimeString()
    });
  });

  // 色更新
  socket.on("updateColor", ({ color })=>{
    updateActive(socket);
    const u = users.find(u=>u.id===socket.id);
    if(u){
      u.color = color;
      io.to(socket.room).emit("userList", users.filter(x=>x.room===socket.room));
    }
  });

  // メッセージ
  socket.on("message", data=>{
    updateActive(socket);
    const text = (data.text ?? "").trim();
    if(!text) return;

    const msg = {
      name: socket.username,
      text,
      color: data.color || "black",
      room: socket.room,
      time: getTimeString()
    };

    messagesLog.push(msg);
    saveLogs();
    io.to(socket.room).emit("message", msg);
  });

  socket.on("leave", ()=> socket.disconnect(true));

  socket.on("disconnect", ()=>{
    users = users.filter(u=>u.id!==socket.id);
    io.to(socket.room).emit("userList", users.filter(u=>u.room===socket.room));
    io.emit("lobbyUpdate", getLobbyInfo());
    denkiState.players = denkiState.players.filter(id => id !== socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=>console.log(`Server running on ${PORT}`));
