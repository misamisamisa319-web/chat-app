import express from "express";
import http from "http";
import { Server } from "socket.io";
import fs from "fs";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let users = [];
let messagesLog = [];

/* ===== ログ保存 ===== */
const LOG_FILE = "./logs.json";
if (fs.existsSync(LOG_FILE)) {
  try { messagesLog = JSON.parse(fs.readFileSync(LOG_FILE, "utf8")); }
  catch { messagesLog = []; }
}
function saveLogs() {
  fs.writeFileSync(LOG_FILE, JSON.stringify(messagesLog, null, 2));
}

/* ===== 管理者ログ ===== */
app.get("/admin", (req, res) => {
  if (req.query.key !== process.env.ADMIN_KEY) {
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
    <!doctype html><html lang="ja"><head><meta charset="utf-8">
    <title>管理者ログ</title>
    <style>
      body{font-family:sans-serif;padding:20px}
      table{border-collapse:collapse;width:100%}
      th,td{border:1px solid #ccc;padding:6px}
      th{background:#f0f0f0}
    </style></head><body>
      <h2>管理者ログ</h2>
      <table>
        <tr><th>時刻</th><th>部屋</th><th>名前</th><th>種別</th><th>内容</th></tr>
        ${rows}
      </table>
    </body></html>
  `);
});

/* ===== ロビー情報 ===== */
function getLobbyInfo() {
  const rooms = {};
  users.forEach(u => {
    if (!rooms[u.room]) rooms[u.room] = { count: 0, names: [] };
    rooms[u.room].count++;
    rooms[u.room].names.push(u.name);
  });
  return rooms;
}

/* ===== 個室鍵 ===== */
const roomKeys = {
  privateA: "1234a",
  privateB: "1234b",
  privateC: "1234c",
  privateD: "1234d",
};

/* ===== 時刻 ===== */
function getTimeString() {
  const d = new Date(
    new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
  );
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

/* ===============================
   罰（元のまま・色つき）
================================ */
const punishItems = [/* ← あなたの女子罰30件そのまま */];
const boyPunishItems = [/* ← 男子罰30件そのまま */];
const specialPainPunishItems = [/* ← 苦痛罰20件そのまま */];

function shuffle(a){ return a.sort(()=>Math.random()-0.5); }
let punishStockByRoom = {};

function initPunishRoom(room){
  if (!punishStockByRoom[room]) {
    punishStockByRoom[room] = {
      girl: shuffle([...punishItems]),
      boy: shuffle([...boyPunishItems]),
      pain: shuffle([...specialPainPunishItems])
    };
  }
}
function getGirlPunish(room){
  initPunishRoom(room);
  if (!punishStockByRoom[room].girl.length)
    punishStockByRoom[room].girl = shuffle([...punishItems]);
  return punishStockByRoom[room].girl.shift();
}
function getBoyPunish(room){
  initPunishRoom(room);
  if (!punishStockByRoom[room].boy.length)
    punishStockByRoom[room].boy = shuffle([...boyPunishItems]);
  return punishStockByRoom[room].boy.shift();
}
function getPainPunish(room){
  initPunishRoom(room);
  if (!punishStockByRoom[room].pain.length)
    punishStockByRoom[room].pain = shuffle([...specialPainPunishItems]);
  return punishStockByRoom[room].pain.shift();
}

/* ===============================
   15分無反応切断（復旧）
================================ */
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

/* ===============================
   ⚡ 電気椅子（追加分だけ）
================================ */
const DENKI_ROOM = "denki";
let denki = {
  players: [],
  turn: 0,
  phase: "set",
  trapSeat: null
};

function denkiState(){
  return {
    phase: denki.phase,
    players: denki.players.map((p,i)=>({
      id:p.id,
      name:p.name,
      score:p.score,
      shock:p.shock,
      isTurn: denki.turn===i
    }))
  };
}
function resetDenki(){
  denki.phase="set";
  denki.trapSeat=null;
}

/* ===============================
   Socket.IO
================================ */
io.on("connection", socket => {

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

  socket.on("join", ({ name, color="black", room="room1" }) => {
    socket.username = name;
    socket.room = room;
    socket.join(room);

    users.push({ id:socket.id, name, color, room, lastActive:Date.now() });

    io.to(room).emit("userList", users.filter(u=>u.room===room));
    socket.emit("pastMessages", messagesLog.filter(m=>m.room===room));
    io.emit("lobbyUpdate", getLobbyInfo());

    if (room === DENKI_ROOM && denki.players.length < 2) {
      denki.players.push({ id:socket.id, name, score:0, shock:0 });
      io.to(DENKI_ROOM).emit("denkiState", denkiState());
    }
  });

  socket.on("denkiSet", seat=>{
    if(socket.room!==DENKI_ROOM) return;
    const me = denki.players[denki.turn];
    if(!me || me.id!==socket.id || denki.phase!=="set") return;
    denki.trapSeat = seat;
    denki.phase = "sit";
    io.to(DENKI_ROOM).emit("denkiState", denkiState());
  });

  socket.on("denkiSit", seat=>{
    if(socket.room!==DENKI_ROOM || denki.phase!=="sit") return;
    const victim = denki.players.find(p=>p.id!==denki.players[denki.turn].id);
    if(!victim || victim.id!==socket.id) return;

    let text, color;
    if(seat===denki.trapSeat){
      victim.score = 0;
      victim.shock += 1;
      text = `⚡ 電流！${victim.name} は0点`;
      color = "red";
    } else {
      victim.score += seat;
      text = `😌 セーフ！${victim.name} は${seat}点`;
      color = "green";
    }

    const msg={name:"system",text,color,room:DENKI_ROOM,time:getTimeString()};
    messagesLog.push(msg); saveLogs();
    io.to(DENKI_ROOM).emit("message",msg);

    denki.turn = 1-denki.turn;
    resetDenki();
    io.to(DENKI_ROOM).emit("denkiState", denkiState());
  });

  socket.on("message", data=>{
    updateActive(socket);
    const text=(data.text??"").trim();
    if(!text) return;

    const m=text.match(/^(\d+)d(\d+)(?:\+(\d+))?$/i);
    if(m){
      const c=Math.min(+m[1],20), f=Math.min(+m[2],10000), p=+(m[3]||0);
      const r=Array.from({length:c},()=>Math.floor(Math.random()*f)+1);
      const msg={
        name:socket.username,
        text:`${c}d${f}${p?`+${p}`:""} →（${r.join(",")}）＝${r.reduce((a,b)=>a+b,0)+p}`,
        room:socket.room,
        time:getTimeString()
      };
      messagesLog.push(msg); saveLogs();
      io.to(socket.room).emit("message",msg);
      return;
    }

    if(text==="女子罰"){
      const msg={name:"system",text:getGirlPunish(socket.room),color:"red",room:socket.room,time:getTimeString()};
      messagesLog.push(msg); saveLogs(); io.to(socket.room).emit("message",msg); return;
    }
    if(text==="男子罰"){
      const msg={name:"system",text:getBoyPunish(socket.room),color:"blue",room:socket.room,time:getTimeString()};
      messagesLog.push(msg); saveLogs(); io.to(socket.room).emit("message",msg); return;
    }
    if(text==="苦痛罰" && socket.room==="special"){
      const msg={name:"system",text:getPainPunish(socket.room),color:"purple",room:socket.room,time:getTimeString()};
      messagesLog.push(msg); saveLogs(); io.to(socket.room).emit("message",msg); return;
    }

    if(data.to){
      const msg={name:socket.username,text,room:socket.room,time:getTimeString(),private:true,to:data.to};
      messagesLog.push(msg); saveLogs();
      socket.emit("message",msg);
      io.to(data.to).emit("message",msg);
      return;
    }

    const msg={name:socket.username,text,room:socket.room,time:getTimeString()};
    messagesLog.push(msg); saveLogs();
    io.to(socket.room).emit("message",msg);
  });

  socket.on("leave",()=>socket.disconnect(true));
  socket.on("disconnect",()=>{
    users = users.filter(u=>u.id!==socket.id);
    denki.players = denki.players.filter(p=>p.id!==socket.id);
    io.emit("lobbyUpdate", getLobbyInfo());
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=>console.log(`Server running on ${PORT}`));
