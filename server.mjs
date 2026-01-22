import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let users = [];
let messagesLog = [];

/* ===== 時刻 ===== */
function getTimeString() {
  const d = new Date(
    new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
  );
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}


/* ===== 罰 ===== */
// 女子罰30個
const punishItems = [
"女子罰1.勝者の指定する方法で1d5分間の全力オナニー（ルブルにて1d5のサイコロを振り「○分間全力オナニーをします」と発言し、今の心境も書き残してくること）",
"女子罰2.全裸になり脚を開き、人差し指と中指でクリトリスを軽く挟み込んで擦る。3分以内に100往復こする。",
"女子罰3.「勝利者様にオナニーをするところを見ていただいています。見学者が多いほど興奮します。是非見に来てください♡残り罰回数は〇回です」とルブルの部屋で宣伝し、誰かが来るまでおまんこに人差し指と中指・クリトリスに親指を当て、膣の中で親指と中指をくっつけるように動かし続ける。",
"女子罰4.利き手とは逆の手の親指と中指で左乳首を挟みクニクニしながら、利き手の中指・薬指でクリトリスを挟み左右に3分以内180往復動かす",
"女子罰5.人差指or中指をクリトリスに当て、PCのマウスをクリックするくらいの強さでクリトリスを1分以内60回タップする。",
"女子罰6.舌・両乳首に洗濯ばさみをつけて罰を続ける、無理な場合その箇所分×２回罰追加",
"女子罰7.お尻の穴に綿棒・ペン・アナルプラグなどを1本入れる。入れたものを報告すること。",
"女子罰8.メンソレータムを乳首とクリとオマンコに塗り込む、ない場合はフリー命令",
"女子罰9.勝者は好きな質問を3つ(ただし住所や電話番号等の質問は不可)。罰者は正直に答えなければならない。答えられないとした場合は罰回数+2。",
"女子罰10.勝者からのフリー命令",
"女子罰11.勝利者の指定する方法でオナニーをして寸止めする。",
"女子罰12.入室者の数だけ寸止めオナニーをする。",
"女子罰13.玩具を全て告白し、勝者が選んだ道具(複数同時可)を使用して一回寸止めオナニーする。",
"女子罰14.ルブルの部屋上げをして「今から寸止めオナニーします。見に来てください」とつぶやき、一回寸止めオナニーする。",
"女子罰15.自分が思う一番惨めで恥ずかしく感じやすいオナニーの仕方を告白し、その方法で一回寸止めする。",
"女子罰16.オナニーの頻度と一番好きなオナニーのおかず・方法を告白する。その後、告白した方法で一回寸止めする。",
"女子罰17.性感帯を告白し、そこを重点的に攻めたオナニーで一回寸止めする。",
"女子罰18.四つん這いになって部屋を1周歩く、その際部屋の紹介をする。",
"女子罰19.(自分が)されたい事/(相手に)させたい事をそれぞれ正直に告白。",
"女子罰20.今まで受けた最も恥ずかしい体験を告白する。",
"女子罰21.現在の下半身を写真に取り、携帯に1週間保管する",
"女子罰22.勝利者から好きな箇所に落書きを1つして写真を撮りロック画面に3日する。",
"女子罰23.勝利者から好きな箇所に落書きを1つしてラインorカカオの異性に1人に「今の姿を説明しどう思う？」と送る。",
"女子罰24.ラインorカカオの異性に1人に「私にエッチな命令して」と送る。",
"女子罰25.HNを勝利者の指定する名前に変えるそして、ラインorカカオの名前を現状の名前に終わるまで変える。（例：雑魚マンコ名前）",
"女子罰26.HNを勝利者の指定する名前に変える。ルブルの部屋上げをして、勝利者の指定した言葉をつぶやく",
"女子罰27.実況しながら寸止めオナニー（保留可）",
"女子罰28.実況しながらイクまでオナニー(保留可)",
"女子罰29.【地獄】カーテンを全開の窓際に立ち、勝利者の指定した方法で一回寸止めオナニーする。",
"女子罰30.【地獄】勝利者の奴隷に3日なる。",
];

// 男子罰30個
const boyPunishItems = [
"男子罰1.寸止め１回する。",
"男子罰2.右乳首に思いきりデコピンを10回する。",
"男子罰3.左乳首に思いきりデコピンを10回する。",
"男子罰4.右のお尻を10回全力で叩く。",
"男子罰5.左のお尻を10回全力で叩く。",
"男子罰6.舌・両乳首に洗濯ばさみをつけて罰を続ける、無理な場合その箇所分×２回罰追加",
"男子罰7.お尻の穴に綿棒・ペン・アナルプラグなどを1本入れる。入れたものを報告すること。",
"男子罰8.メンソレータムを乳首と亀頭に塗り込む",
"男子罰9.勝者は好きな質問を1つ(ただし住所や電話番号等の質問は不可)。罰者は正直に答えなければならない。答えられないとした場合は罰回数+2。",
"男子罰10.四つん這いになって部屋を1周歩く、その際部屋の紹介をする。",
"男子罰11.勝者からのフリー命令",
"男子罰12.勝利者の指定する方法でオナニーをして寸止めする。",
"男子罰13.入室者の数だけ寸止めオナニーをする。",
"男子罰14.玩具を全て告白し、勝者が選んだ道具(複数同時可)を使用して一回寸止めオナニーする。",
"男子罰15.ルブルの部屋上げをして「今から寸止めオナニーします。見に来てください」とつぶやき、一回寸止めオナニーする。",
"男子罰16.自分が思う一番惨めで恥ずかしく感じやすいオナニーの仕方を告白し、その方法で一回寸止めする。",
"男子罰17.オナニーの頻度と一番好きなオナニーのおかず・方法を告白する。その後、告白した方法で一回寸止めする。",
"男子罰18.性感帯を告白し、そこを重点的に攻めたオナニーで一回寸止めする。",
"男子罰19.(自分が)されたい事/(相手に)させたい事をそれぞれ正直に告白。",
"男子罰20.今まで受けた最も恥ずかしい体験を告白する。",
"男子罰21.現在の下半身を写真に取り、携帯に3日保管する",
"男子罰22.勝利者から好きな箇所に落書きを1つして写真を撮りロック画面に3日する。",
"男子罰23.勝利者から好きな箇所に落書きを1つしてラインorカカオの異性に1人に「今の姿を説明しどう思う？」と送る。",
"男子罰24.ラインorカカオの異性に1人に「私にエッチな命令して」と送る。",
"男子罰25.HNを勝利者の指定する名前に変えるそして、ラインorカカオの名前を現状の名前に終わるまで変える。（例：雑魚マンコ名前）",
"男子罰26.HNを勝利者の指定する名前に変える。ルブルにもその名前でログインし勝者の指定した言葉をつぶやく",
"男子罰27.実況しながら寸止めオナニー（保留可）",
"男子罰28.実況しながらイクまでオナニー(保留可)",
"男子罰29.【地獄】女性化調教。勝者に女性としての名前、名前の色をつけてもらう。一人称は「あたし」で男言葉使用禁止、女になりきってチャットすること。女性用ショーツとパンスト、家ではブラやパッド、スカートも手に入る場合は身につける。下着禁止や脱衣命令が出ても脱ぐのは禁止。おちんぽはクリ、アナルはおまんこと呼称する。オナニーする場合は普通にしごく男としてのオナニーを禁止し、女性のクリオナのように撫でるようにショーツの上から喘ぎながら行うこと。期間は次に勝負に勝つまでとする。",
"男子罰30.【地獄】勝利者の奴隷に3日なる。",
];

function shuffle(a){ return a.sort(()=>Math.random()-0.5); }
let girlPunishStock = shuffle([...punishItems]);
let boyPunishStock = shuffle([...boyPunishItems]);

function getGirlPunish(){ if(!girlPunishStock.length) girlPunishStock=shuffle([...punishItems]); return girlPunishStock.shift(); }
function getBoyPunish(){ if(!boyPunishStock.length) boyPunishStock=shuffle([...boyPunishItems]); return boyPunishStock.shift(); }
function resetPunishments(){ girlPunishStock=shuffle([...punishItems]); boyPunishStock=shuffle([...boyPunishItems]); }

/* ===== 30分無反応切断 ===== */
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
        s.emit("message",{ name:"system", text:"15分間反応がなかったため切断されました", room:u.room, time:getTimeString() });
        s.disconnect(true);
      }
    }
  });
}, 60*1000);

/* ===== 接続 ===== */
io.on("connection", socket => {
  console.log("接続:", socket.id);

  socket.on("join", ({ name, color="black", room="room1" }) => {
    let finalName = name;
    if(users.find(u=>u.name===finalName)){
      let i=2; while(users.find(u=>u.name===name+i)) i++; finalName=name+i;
    }
    socket.username = finalName;
    socket.room = room;
    socket.join(room);

    users.push({ id:socket.id, name:finalName, color, room, lastActive:Date.now() });

    io.to(room).emit("userList", users.filter(u=>u.room===room));
    socket.emit("pastMessages", messagesLog.filter(m=>m.room===room));
  });

  socket.on("updateColor", ({ color })=>{
    updateActive(socket);
    const u = users.find(u=>u.id===socket.id);
    if(!u) return;
    u.color = color;
    io.to(socket.room).emit("userList", users.filter(x=>x.room===socket.room));
  });

  socket.on("message", data=>{
   // ===== ダイス判定 =====
const diceText = (data.text ?? "").trim();
const diceMatch = diceText.match(/^(\d+)d(\d+)([+-]\d+)?$/i);

if (diceMatch) {
  const count = Number(diceMatch[1]);
  const sides = Number(diceMatch[2]);
  const mod = diceMatch[3] ? Number(diceMatch[3]) : 0;

  // 上限ガード
  if (count < 1 || sides < 1 || count > 10 || sides > 1000) return;

  const user = users.find(u => u.id === socket.id);
  const color = user?.color || "black";

  const rolls = [];
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * sides) + 1);
  }

  const sum = rolls.reduce((a, b) => a + b, 0);
  const total = sum + mod;

  const modText = mod === 0 ? "" : (mod > 0 ? `+${mod}` : `${mod}`);
  const detail =
    mod === 0
      ? `（${rolls.join(" + ")}）＝ ${sum}`
      : `（${rolls.join(" + ")}）${modText} ＝ ${total}`;

  const msg = {
    name: socket.username,
    text: `${count}d${sides}${modText} → ${detail}`,
    color,
    room: socket.room,
    time: getTimeString()
  };

  messagesLog.push(msg);
  io.to(socket.room).emit("message", msg);
  return;
}

    updateActive(socket);
    const text = data.text ?? "";
    if(!text.trim()) return;
    const user = users.find(u=>u.id===socket.id);
    const color = user?.color || "black";

    if(text==="女子罰"){
      const msg = { name:socket.username, text:`女子罰 → ${getGirlPunish()}`, type:"girl", color:"red", room:socket.room, time:getTimeString() };
      messagesLog.push(msg); io.to(socket.room).emit("message", msg); return;
    }
    if(text==="男子罰"){
      const msg = { name:socket.username, text:`男子罰 → ${getBoyPunish()}`, type:"boy", color:"blue", room:socket.room, time:getTimeString() };
      messagesLog.push(msg); io.to(socket.room).emit("message", msg); return;
    }

    if(data.to){
      const target = users.find(u=>u.id===data.to);
      if(!target || target.room!==socket.room) return;
      const msg = { name:socket.username, text, color, to:target.id, private:true, room:socket.room, time:getTimeString() };
      socket.emit("message", msg); io.to(target.id).emit("message", msg); return;
    }

    const msg = { name:socket.username, text, color, room:socket.room, time:getTimeString() };
    messagesLog.push(msg); io.to(socket.room).emit("message", msg);
  });

  socket.on("leave", ()=> socket.disconnect(true));

  socket.on("disconnect", ()=>{
    users = users.filter(u=>u.id!==socket.id);
    io.to(socket.room).emit("userList", users.filter(u=>u.room===socket.room));
    if(!users.some(u=>u.room===socket.room)){
      resetPunishments();
      messagesLog = messagesLog.filter(m=>m.room!==socket.room); // 部屋空でログ削除
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=>console.log(`Server running on ${PORT}`));
