import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let users = [];
let messagesLog = [];

/* ===== ロビー情報 ===== */
function getLobbyInfo() {
  const rooms = {};
  users.forEach(u => {
    if (!rooms[u.room]) {
      rooms[u.room] = { count: 0, names: [] };
    }
    rooms[u.room].count++;
    rooms[u.room].names.push(u.name);
  });
  return rooms;
}

/* ===== 個室の鍵 ===== */
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

/* ===== 罰 ===== */
const punishItems = [/* 女子罰30個（省略せずそのまま） */];
const boyPunishItems = [/* 男子罰30個（省略せずそのまま） */];

function shuffle(a){ return a.sort(()=>Math.random()-0.5); }
let girlPunishStock = shuffle([...punishItems]);
let boyPunishStock  = shuffle([...boyPunishItems]);

function getGirlPunish(){
  if(!girlPunishStock.length) girlPunishStock = shuffle([...punishItems]);
  return girlPunishStock.shift();
}
function getBoyPunish(){
  if(!boyPunishStock.length) boyPunishStock = shuffle([...boyPunishItems]);
  return boyPunishStock.shift();
}
function resetPunishments(){
  girlPunishStock = shuffle([...punishItems]);
  boyPunishStock  = shuffle([...boyPunishItems]);
}

/* ===== 15分無反応切断 ===== */
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
}, 60*1000);

/* ===== 接続 ===== */
io.on("connection", socket => {
  console.log("接続:", socket.id);

  /* ===== ロビー鍵チェック ===== */
  socket.on("checkRoomKey", ({ room, key }) => {

    // 鍵チェック
    if (roomKeys[room]) {
      if (!key || key !== roomKeys[room]) {
        socket.emit("checkResult", { ok:false, message:"鍵が違います" });
        return;
      }
    }

    // 個室満室チェック
    const privateRooms = ["privateA","privateB","privateC","privateD"];
    if (privateRooms.includes(room)) {
      const roomSet = io.sockets.adapter.rooms.get(room);
      const count = roomSet ? roomSet.size : 0;
      if (count >= 2) {
        socket.emit("checkResult", { ok:false, message:"この個室は満室です" });
        return;
      }
    }

    socket.emit("checkResult", { ok:true });
  });

  /* ===== 入室 ===== */
  socket.on("join", ({ name, color="black", room="room1" }) => {

    // 個室2人制限（保険）
    const privateRooms = ["privateA","privateB","privateC","privateD"];
    if (privateRooms.includes(room)) {
      const roomSet = io.sockets.adapter.rooms.get(room);
      const count = roomSet ? roomSet.size : 0;
      if (count >= 2) {
        socket.emit("message", {
          name:"system",
          text:"この個室は2人までです",
          room,
          time:getTimeString()
        });
        return;
      }
    }

    // 名前重複回避
    let finalName = name;
    if (users.find(u=>u.name===finalName)) {
      let i = 2;
      while (users.find(u=>u.name===name+i)) i++;
      finalName = name + i;
    }

    socket.username = finalName;
    socket.room = room;
    socket.join(room);

    users.push({
      id: socket.id,
      name: finalName,
      color,
      room,
      lastActive: Date.now()
    });

    io.to(room).emit("userList", users.filter(u=>u.room===room));
    socket.emit("pastMessages", messagesLog.filter(m=>m.room===room));
    io.emit("lobbyUpdate", getLobbyInfo());
  });

  /* ===== 色変更 ===== */
  socket.on("updateColor", ({ color })=>{
    updateActive(socket);
    const u = users.find(u=>u.id===socket.id);
    if(!u) return;
    u.color = color;
    io.to(socket.room).emit("userList", users.filter(x=>x.room===socket.room));
  });

  /* ===== メッセージ ===== */
  socket.on("message", data=>{
    updateActive(socket);
    const text = (data.text ?? "").trim();
    if(!text) return;

    const user = users.find(u=>u.id===socket.id);
    const color = user?.color || "black";

    if(text==="女子罰"){
      const msg = {
        name:socket.username,
        text:`女子罰 → ${getGirlPunish()}`,
        type:"girl",
        color:"red",
        room:socket.room,
        time:getTimeString()
      };
      messagesLog.push(msg);
      io.to(socket.room).emit("message", msg);
      return;
    }

    if(text==="男子罰"){
      const msg = {
        name:socket.username,
        text:`男子罰 → ${getBoyPunish()}`,
        type:"boy",
        color:"blue",
        room:socket.room,
        time:getTimeString()
      };
      messagesLog.push(msg);
      io.to(socket.room).emit("message", msg);
      return;
    }

    if(data.to){
      const target = users.find(u=>u.id===data.to);
      if(!target || target.room!==socket.room) return;
      const msg = {
        name:socket.username,
        text,
        color,
        to:target.id,
        private:true,
        room:socket.room,
        time:getTimeString()
      };
      socket.emit("message", msg);
      io.to(target.id).emit("message", msg);
      return;
    }

    const msg = {
      name:socket.username,
      text,
      color,
      room:socket.room,
      time:getTimeString()
    };
    messagesLog.push(msg);
    io.to(socket.room).emit("message", msg);
  });

  /* ===== 退出 ===== */
  socket.on("leave", ()=> socket.disconnect(true));

  socket.on("disconnect", ()=>{
    users = users.filter(u=>u.id!==socket.id);
    io.to(socket.room).emit("userList", users.filter(u=>u.room===socket.room));

    if(!users.some(u=>u.room===socket.room)){
      resetPunishments();
      messagesLog = messagesLog.filter(m=>m.room!==socket.room);
    }
    io.emit("lobbyUpdate", getLobbyInfo());
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=>console.log(`Server running on ${PORT}`));
