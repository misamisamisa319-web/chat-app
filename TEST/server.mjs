import express from "express";
import http from "http";
import { Server } from "socket.io";
import fs from "fs";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
let users = [];
// ===== 部屋空ログ削除タイマー =====
let emptyRoomTimers = {};

const EMPTY_DELETE_TIME =
  10 * 60 * 1000; // 10分

// ===== 個人ミュート（部屋単位・名前保存） =====
let muteByRoom = {
  // room1: {
  //   "ミサ": ["荒らし"]
  // }
};



// ===== ログ分離（追加） =====
let roomLogs = [];
let adminLogs = [];

// 既存互換（まだ使う）
let messagesLog = [];

let bans = {}; // { name: expireTime }
let ipBans = {}; // { ip: expireTime }


const OG_LIFETIME = 3 * 24 * 60 * 60 * 1000; // 3日

/* ===== ログ保存 ===== */
const LOG_FILE = "/data/logs.json";

if (fs.existsSync(LOG_FILE)) {
  try {

    const data =
      JSON.parse(fs.readFileSync(LOG_FILE, "utf8"));

    messagesLog = data;
    adminLogs  = data;

  }
  catch {
    messagesLog = [];
    adminLogs  = [];
  }
}

function saveLogs() {

  fs.writeFileSync(
    LOG_FILE,
    JSON.stringify(adminLogs, null, 2)
  );

}

function getDateTimeString() {
  const d = new Date(
    new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
  );

  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, "0");
  const D = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");

  return `${Y}/${M}/${D} ${h}:${m}`;
}
function normalizeLog(msg){
  return {
    ...msg,
    name: msg.name || "system",
    room: msg.room || "room1",
    text: msg.text || "",
    time: msg.time || "",
    private: msg.private || false,
    savedAt: Date.now()
  };
}



/* ===== 管理者ログ ===== */
app.get("/admin", (req, res) => {
function addDate(timeStr) {
  if (!timeStr) return "";

  // timeStr = "YYYY/MM/DD hh:mm" 形式前提
  if (timeStr.includes("/")) {
    const [date, time] = timeStr.split(" ");
    const [, M, D] = date.split("/");
    return `${M}/${D} ${time}`;
  }

  return timeStr;
}



  if (req.query.key !== process.env.ADMIN_KEY) {
    return res.status(403).send("Forbidden");
  }

  const roomOrder = [
  "room1",
  "room2",
  "room3",
  "room4",
  "room5",
  "room6",
  "denki",
  "denki1",
  "denki2",
  "special",
  "privateA",
  "privateB",
  "privateC",
  "privateD"
];

const userRows = [...users]
.sort((a, b) => {

  const rA = roomOrder.indexOf(a.room);
  const rB = roomOrder.indexOf(b.room);

  if (rA !== rB) return rA - rB;

  return a.name.localeCompare(b.name, "ja");

})
.map(u => `
<tr>
  <td>${u.room}</td>
  <td>${u.name}</td>
  <td>${u.ip || "-"}</td>
  <td>

       <form method="POST" action="/admin/kick" style="display:inline;">
  <input type="hidden" name="key" value="${process.env.ADMIN_KEY}">
  <input type="hidden" name="userId" value="${u.id}">
  <button type="submit">キック</button>
</form>

<form method="POST" action="/admin/ipban24" style="display:inline;">
  <input type="hidden" name="key" value="${process.env.ADMIN_KEY}">
  <input type="hidden" name="ip" value="${u.ip}">
  <button type="submit">IP 24h BAN</button>
</form>

<form method="POST" action="/admin/ipbanPermanent" style="display:inline;">
  <input type="hidden" name="key" value="${process.env.ADMIN_KEY}">
  <input type="hidden" name="ip" value="${u.ip}">
  <button type="submit">IP 永久BAN</button>
</form>

<form method="POST" action="/admin/ipbanRemove" style="display:inline;">
  <input type="hidden" name="key" value="${process.env.ADMIN_KEY}">
  <input type="hidden" name="ip" value="${u.ip}">
  <button type="submit">BAN解除</button>
</form>




      </td>
    </tr>
`).join("");


const selectedRoom = req.query.room || "all";

const filteredLogs =
  selectedRoom === "all"
    ? adminLogs
    : adminLogs.filter(m =>
        m.room === selectedRoom
      );

 const logRows = [...filteredLogs].reverse().map(m => {


  let nameDisplay = m.name;

  if (m.private) {
    nameDisplay =
      `${m.name} ▶ ${m.toName || "不明"}`;
  }

  return `
    <tr>
      <td>${addDate(m.time)}</td>
      <td>${m.room}</td>
      <td>${nameDisplay}</td>
      <td>${m.private ? "内緒" : "通常"}</td>
      <td>${m.text}</td>
    </tr>
  `;

}).join("");


  res.send(`
    <!doctype html>
    <html lang="ja">
    <head>
      <meta charset="utf-8">
      <title>管理室</title>
      <style>
        body { font-family: sans-serif; padding: 20px; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { border: 1px solid #ccc; padding: 6px; }
        th { background: #f0f0f0; }
      </style>
    </head>
    <body>
      <h2>管理室</h2>

      <h3>接続中ユーザー</h3>
      <table>
     <tr><th>部屋</th><th>名前</th><th>IP</th><th>操作</th></tr>


        ${userRows}
      </table>

      <h3>ログ</h3>
      <form method="GET" action="/admin" style="margin-bottom:10px;">

  <input type="hidden" name="key"
    value="${process.env.ADMIN_KEY}">

  <select name="room"
    onchange="this.form.submit()">
<option value="all"
  ${selectedRoom==="all"?"selected":""}>
  全部
</option>

<option value="room1"
  ${selectedRoom==="room1"?"selected":""}>
  room1
</option>

<option value="room2"
  ${selectedRoom==="room2"?"selected":""}>
  room2
</option>

<option value="room3"
  ${selectedRoom==="room3"?"selected":""}>
  room3
</option>

<option value="room4"
  ${selectedRoom==="room4"?"selected":""}>
  room4
</option>

<option value="room5"
  ${selectedRoom==="room5"?"selected":""}>
  room5
</option>

<option value="room6"
  ${selectedRoom==="room6"?"selected":""}>
  room6
</option>

<option value="denki"
  ${selectedRoom==="denki"?"selected":""}>
  denki
</option>

<option value="denki1"
  ${selectedRoom==="denki1"?"selected":""}>
  denki1
</option>

<option value="denki2"
  ${selectedRoom==="denki2"?"selected":""}>
  denki2
</option>

<option value="special"
  ${selectedRoom==="special"?"selected":""}>
  special
</option>


  </select>

</form>

      <table>
        <tr><th>時刻</th><th>部屋</th><th>名前</th><th>種別</th><th>内容</th></tr>
        ${logRows}
      </table>
      <script>
setTimeout(() => {
  location.reload();
}, 60000);
</script>
    </body>
    </html>
  `);
});
app.post("/admin/kick", (req, res) => {

  if (req.body.key !== process.env.ADMIN_KEY) {
    return res.status(403).send("Forbidden");
  }

  const target = io.sockets.sockets.get(req.body.userId);
  if (target) {
    target.emit("message", {
      name: "system",
      text: "管理者によりキックされました",
      room: target.room,
      time: getTimeString()
    });
    target.disconnect(true);
  }

  res.redirect("/admin?key=" + process.env.ADMIN_KEY);
});

app.post("/admin/ipban24", (req, res) => {

  if (req.body.key !== process.env.ADMIN_KEY) {
    return res.status(403).send("Forbidden");
  }

  const ip = req.body.ip;

  // ===== 24時間BAN =====
  ipBans[ip] =
    Date.now() + (24 * 60 * 60 * 1000);

  // ===== 接続中IP切断 =====
  users
    .filter(u => u.ip === ip)
    .forEach(u => {

      const s =
        io.sockets.sockets.get(u.id);

      if (s){
        s.disconnect(true);
      }

    });

  res.redirect("/admin?key=" + process.env.ADMIN_KEY);
});

app.post("/admin/ipbanPermanent", (req, res) => {

  if (req.body.key !== process.env.ADMIN_KEY) {
    return res.status(403).send("Forbidden");
  }

  const ip = req.body.ip;

  // ===== 永久BAN =====
  ipBans[ip] = Infinity;

  // ===== 接続中IP切断 =====
  users
    .filter(u => u.ip === ip)
    .forEach(u => {

      const s =
        io.sockets.sockets.get(u.id);

      if (s){
        s.disconnect(true);
      }

    });

  res.redirect("/admin?key=" + process.env.ADMIN_KEY);
});

app.post("/admin/ipbanRemove", (req, res) => {

  if (req.body.key !== process.env.ADMIN_KEY) {
    return res.status(403).send("Forbidden");
  }

  const ip = req.body.ip;

  // ===== BAN解除 =====
  delete ipBans[ip];

  res.redirect("/admin?key=" + process.env.ADMIN_KEY);
});


app.post("/admin/ban", (req, res) => {

  if (req.body.key !== process.env.ADMIN_KEY) {
    return res.status(403).send("Forbidden");
  }

  const name = req.body.userName;

  bans[name] = Date.now() + (30 * 60 * 1000);

  const targetUser = users.find(u => u.name === name);
  if (targetUser) {
    const targetSocket =
      io.sockets.sockets.get(targetUser.id);
    if (targetSocket) {
      targetSocket.disconnect(true);
    }
  }

  res.redirect("/admin?key=" + process.env.ADMIN_KEY);
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
  special: "12345678",
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
// 女子罰30個
const punishItems = [
"女子罰1.勝者の指定する方法で1d5+3分間の全力オナニー（ルブルにて1d5のサイコロを振り「○分間全力オナニーをします」と発言し、今の心境も書き残してくること）",
"女子罰2.全裸になり脚を開き、人差し指と中指でクリトリスを軽く挟み込んで擦る。3分以内に100往復する。",
"女子罰3.「勝利者様にオナニーをするところを見ていただいています。見学者が多いほど興奮します。是非見に来てください♡残り罰回数は〇回です」とルブルの部屋で宣伝し、誰かが来るまでおまんこに人差し指と中指・クリトリスに親指を当て、膣の中で親指と中指をくっつけるように動かし続ける。",
"女子罰4.利き手とは逆の手の親指と中指で左乳首を挟みクニクニしながら、利き手の中指・薬指でクリトリスを挟み左右に3分以内180往復動かす",
"女子罰5.人差指or中指をクリトリスに当て、PCのマウスをクリックするくらいの強さでクリトリスを1分以内60回タップする。",
"女子罰6.「私はドMの変態ですとつぶやきながら」頭の上で手を組んでガニ股で立った状態で腰へコ30回。",
"女子罰7.勝者からのフリー命令",
"女子罰8.メンソレータムを乳首とクリとオマンコに塗り込む、ない場合はフリー命令",
"女子罰9.勝者は好きな質問を3つ(ただし住所や電話番号等の質問は不可)。罰者は正直に答えなければならない。答えられないとした場合は罰回数+2。",
"女子罰10.ルブルの部屋上げをして「私はたくさんの人に罵倒されながらオナニーするのが好きです。お願いします見に来てください。」とつぶやき、一回寸止めオナニーする。",
"女子罰11.勝利者の指定する方法でオナニーをして寸止めする。",
"女子罰12.入室者の数だけ寸止めオナニーをする。",
"女子罰13.玩具を全て告白し、勝者が選んだ道具(複数同時可)を使用して一回寸止めオナニーする。玩具がない場合は寸止め3回連続する。",
"女子罰14.ルブルの部屋上げをして「今から寸止めオナニーします。見に来てください」とつぶやき、一回寸止めオナニーする。",
"女子罰15.自分が思う一番惨めで恥ずかしいオナニーの仕方を告白し、その方法で一回寸止めする。",
"女子罰16.オナニーの頻度と一番好きなオナニーのおかず・方法を告白する。その後、告白した方法で一回寸止めする。",
"女子罰17.性感帯を告白し、そこを重点的に攻めたオナニーで一回寸止めする。",
"女子罰18.四つん這いになって部屋を1周歩く、その際部屋の紹介をする。",
"女子罰19.(自分が)されたい事/(相手に)させたい事をそれぞれ正直に告白。",
"女子罰20.今まで受けた最も恥ずかしいえっちな体験を告白する。",
"女子罰21.現在の下半身を写真に取り、携帯に1週間保管する",
"女子罰22.勝利者から好きな箇所に落書き(水性化）を1つして写真を撮りロック画面に3日する。",
"女子罰23.勝利者から好きな箇所に落書き(水性化）を1つしてラインorカカオの異性に1人に「今の姿を説明しどう思う？」と送る。出来ない場合は勝利者がフリー命令。",
"女子罰24.ラインorカカオの異性に1人に「私にエッチな命令して」と送る。出来ない場合は勝利者がフリー命令。",
"女子罰25.HNを勝利者の指定する名前に変えるそして、ラインorカカオの名前を現状の名前に終わるまで変える。出来ない場合は勝利者がフリー命令。（例：雑魚マンコ名前）",
"女子罰26.HNを勝利者の指定する名前に変える。ルブルの部屋上げをして、勝利者の指定した言葉をつぶやく",
"女子罰27.実況しながら寸止めオナニー（保留可）",
"女子罰28.実況しながらイクまでオナニー(保留可)",
"女子罰29.【地獄】カーテンを全開の窓際に立ち、勝利者の指定した方法で一回寸止めオナニーする。",
"女子罰30.【地獄】玄関のドアを少し開けて勝利者の指定した方法で一回寸止めオナニーする。",
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
"男子罰14.玩具を全て告白し、勝者が選んだ道具(複数同時可)を使用して一回寸止めオナニーする。玩具がない場合は寸止め3回連続する。",
"男子罰15.ルブルの部屋上げをして「今から寸止めオナニーします。見に来てください」とつぶやき、一回寸止めオナニーする。",
"男子罰16.自分が思う一番惨めで恥ずかしいオナニーの仕方を告白し、その方法で一回寸止めする。",
"男子罰17.オナニーの頻度と一番好きなオナニーのおかず・方法を告白する。その後、告白した方法で一回寸止めする。",
"男子罰18.性感帯を告白し、そこを重点的に攻めたオナニーで一回寸止めする。",
"男子罰19.(自分が)されたい事/(相手に)させたい事をそれぞれ正直に告白。",
"男子罰20.今まで受けた最も恥ずかしい体験を告白する。",
"男子罰21.現在の下半身を写真に取り、携帯に3日保管する",
"男子罰22.勝利者から好きな箇所に落書きを1つして写真を撮りロック画面に3日する。",
"男子罰23.勝利者から好きな箇所に落書きを1つしてラインorカカオの異性に1人に「今の姿を説明しどう思う？」と送る。出来ない場合は勝利者がフリー命令。",
"男子罰24.ラインorカカオの異性に1人に「私にエッチな命令して」と送る。出来ない場合は勝利者がフリー命令。",
"男子罰25.HNを勝利者の指定する名前に変えるそして、ラインorカカオの名前を現状の名前に終わるまで変える。出来ない場合は勝利者がフリー命令。（例：雑魚マンコ名前）",
"男子罰26.HNを勝利者の指定する名前に変える。ルブルにもその名前でログインし勝者の指定した言葉をつぶやく",
"男子罰27.実況しながら寸止めオナニー（保留可）",
"男子罰28.実況しながらイクまでオナニー(保留可)",
"男子罰29.【地獄】女性化調教。勝者に女性としての名前、名前の色をつけてもらう。一人称は「あたし」で男言葉使用禁止、女になりきってチャットすること。女性用ショーツとパンスト、家ではブラやパッド、スカートも手に入る場合は身につける。下着禁止や脱衣命令が出ても脱ぐのは禁止。おちんぽはクリ、アナルはおまんこと呼称する。オナニーする場合は普通にしごく男としてのオナニーを禁止し、女性のクリオナのように撫でるようにショーツの上から喘ぎながら行うこと。期間は次に勝負に勝つまでとする。",
"男子罰30.【地獄】勝利者の奴隷に3日なる。",
];

// 絶頂許可
const hitoriPunishItems = [
"絶頂許可1.一番好きなオナニーの方法を告白し、その方法で好きな回数絶頂する。",
"絶頂許可2.性感帯をすべて告白して。そこを中心にオナニーして好きな回数絶頂する。",
"絶頂許可3.エッチな想像でされてみたいことを告白して。それを想像しながらオナニーして好きな回数絶頂する。",
"絶頂許可4.Ｍ字開脚の状態で「皆さん私のここをよく見てください」と状態を実況しながら好きな回数絶頂する。",
"絶頂許可5.四つん這いで舌を出しながら「私はオナペットです。皆さん罵倒してください」と言い続けながら好きな回数絶頂する。",
"絶頂許可6.玩具を持ってる場合は玩具で絶頂を好きな回数する。持っていない場合は誰にも知られたくない秘密の性癖を暴露してから手で好きな回数絶頂する。",
"絶頂許可7.マングリ返し状態で顔や胸にかけながら好きな回数絶頂をする。かからない場合かかるまで行う。",
"絶頂許可8.今まで連続で絶頂した回数を言いその回数+1回絶頂するまで手を止めない。最大10回とする",
"絶頂許可9.「私は変態のドMです。」と言い続けながら立ったまま立てなくなるまで絶頂をし続ける。最大10回とする",
"絶頂許可10.参加者の人数分絶頂するまで手を止めてはいけない。最大10回とする",
"絶頂許可11.これまで寸止めした回数絶頂するまで手を止めてはいけない。最大10回とする",
"絶頂許可12.ルブルの部屋で「絶頂許可をいただきました。誰か来るまで絶頂し続けれるので誰も入ってこないでください。」とつぶやき、絶頂しても見学者がくるまで手を動かし絶頂しつづける。最大10回とする",
"絶頂許可13.女性はこれまで中出しされた人の人数、男性はこれまで中出しした人の人数を告白。その人数分連続絶頂する。もし0の処女、童貞は「一度もセックスしたことのない処女、童貞です皆さん憐みの言葉をかけてください」と言いながら絶頂できなくなるまで連続で手を動かすこと。",

];

//命令女
const onaGirlPunishItems = [
"命令女1.乳首に触れないように乳輪を指でくるくるなぞる3分間。",
"命令女2.乳頭を薬指でふれるかふれないかの位置で上下にスリスリする3分間。",
"命令女3.乳首をコリコリする3分間。",
"命令女4.乳首を親指と中指でコリコリ潰しながら人差し指でスリスリ3分間する。",
"命令女5.乳首を親指と中指でコリコリ潰しながら人差し指の爪でカリカリ3分間する。",
"命令女6.乳首にメンソレータムをぬって3分間塗り込む、もしない場合は愛液を塗る。",
"命令女7.クリトリスにメンソレータムを塗って3分間塗り込む、ない場合は歯磨き粉を薄く塗る。",
"命令女8.オマンコの入口にメンソレータムを塗って3分間塗り込む、ない場合は歯磨き粉を薄く塗る。",
"命令女9.クリトリスを指でスリスリ3分間する。",
"命令女10.人差指or中指をクリトリスに当て、PCのマウスをクリックするくらいの強さでクリトリスを3分間タップする。",
"命令女11.中指・薬指二本の指をクリトリスに当て、時計回りに3分間スリスリする。",
"命令女12.人差し指と中指でクリトリスを軽く挟み込んでシコシコ3分間する。",
"命令女13.オマンコの中に指を入れズボズボ出し入れを3分間する。",
"命令女14.オマンコに玩具または棒状の物をズボズボ出し入れ3分間する。",
"命令女15.オマンコにバイブかディルドを入れて抜けないようにパンツを履き全力で押し込むように10回叩く。入れる玩具がない場合は寸止め1回する。",
"命令女16.オマンコにバイブかディルドを入れて抜けないようにパンツを履き膝立ちになり、そこから勢いよく座り奥までバイブを押し込むを10回する。入れる玩具がない場合は寸止めを3回する。",
"命令女17.ガニ股で立ちクリに当たるか当たらないかの位置に人差し指と中指を動かさないように置いて、それに腰ヘコしながらクリを刺激する3分間",
"命令女18.ルブルの部屋上げをして、「見学者様あなたの指示した通りに寸止めオナニーします」とつぶやき5分間オナニーする。5分以内に見学者が来た場合、来た見学者の人数指示をしてもらい寸止めする。",
"命令女19.玩具を持ってる場合は玩具で寸止め1回する。もってない場合は回数+2回。",
"命令女20.回数を+2回してルブルにて1d5+3のサイコロを振り「○分間全力オナニーをします」と発言し、今の心境も書き残してくること。",
"命令女21.回数を+2回して「ドMの変態です。見学者が多いほど興奮します。是非見に来てください♡残り罰回数は〇回です」とルブルの部屋で宣伝し、誰かが来るまでクリをスリスリしつづける。最大10分本人の希望でオーバーしてもよい",
"命令女22.回数を+2回してルブルの部屋に玩具を全て告白して玩具で見学者がくるまでオナニーする。「例：私の持ってる玩具はローター1、バイブ1です」",
"命令女23.ガニ股で立ったまま1回寸止めオナニーする。",
"命令女24.直近一週間のオナニー回数を告白。その中の一つの方法で1回寸止めする。",
"命令女25.性感帯を告白し、そこを重点的に攻めたオナニーで1回寸止めする。",
"命令女26.オナニーの頻度と一番好きなオナニーのおかず・方法を告白する。その後、告白した方法でオナニーをして1回寸止めする。",
"命令女27.自分が思う一番惨めで恥ずかしいオナニーの仕方を告白し、その方法で1回寸止めする。",
"命令女28.今まで経験した人数を告白してその回数寸止めする。",
"命令女29.今現在入室してる人の数寸止めする。",
"命令女30.今まで命令をこなした回数寸止めする。"
];
//命令男
const onaBoyPunishItems = [
"命令男1.乳首に触れないように乳輪を指でくるくるなぞる3分間。",
"命令男2.乳頭を薬指でふれるかふれないかの位置で上下にスリスリする3分間。",
"命令男3.乳首をコリコリする3分間。",
"命令男4.乳首を親指と中指でコリコリ潰しながら人差し指でスリスリ3分間する。",
"命令男5.乳首を親指と中指でコリコリ潰しながら人差し指の爪でカリカリ3分間する。",
"命令男6.乳首にメンソレータムをぬって3分間塗り込む、もしない場合は我慢汁を塗る。",
"命令男7.亀頭にメンソレータムを塗って3分間塗り込む、ない場合は歯磨き粉を薄く塗る。",
"命令男8.１秒間に１回のペースでしこしこ３分する。",
"命令男9.人差し指と中指を折り曲げてカリ首にひっかけるように亀頭だけ3分間しこしこする。",
"命令男10.亀頭を手のひらで撫でるようにスリスリ３分間する。",
"命令男11.竿部分だけをしこしこ３分間する。",
"命令男12.利き手じゃない方でしこしこ３分間する。",
"命令男13.我慢汁をおちんぽ全体に塗り込む。出てない場合は唾液をおちんぽ全体に塗り込む",
"命令男14.亀頭の裏筋を３分間すりすりする。",
"命令男15.足をピンと張って腰を限界まで突き出してしこしこ３分間。",
"命令男16.舌を出しながら四つん這いになって部屋を1周歩く、その際部屋の紹介をする。",
"命令男17.ルブルの部屋上げをして、「見学者様が来なければ破滅してしまいます。どうか助けてください」とつぶやきしこしこし、寸止め状態を維持し見学者に１分計ってもらう。最大10分",
"命令男18.ルブルの部屋上げをして、「見学者様あなたの指示した通りに寸止めオナニーします」とつぶやき5分間オナニーする。5分以内に見学者が来た場合、来た見学者の人数指示をしてもらい寸止めする。",
"命令男19.玩具を持ってる場合は玩具で寸止め1回する。もってない場合は回数+2回。",
"命令男20.回数を+2回してルブルにて1d5+3のサイコロを振り「○分間全力オナニーをします」と発言し、今の心境も書き残してくること。",
"命令男21.回数を+2回して「ドMの変態です。見学者が多いほど興奮します。是非見に来てください♡残り罰回数は〇回です」とルブルの部屋で宣伝し、誰かが来るまで亀頭をスリスリしつづける。最大10分間",
"命令男22.携帯またはタブレットに好きな女性、有名人の画像を写して先っぽつけてしこしこオナニー３分間",
"命令男23.立ったまま指を輪っかにして指を動かさず腰へこオナニーで1回寸止めする。",
"命令男24.直近一週間のオナニー回数を告白。その中の一つの方法で1回寸止めする。",
"命令男25.性感帯を告白し、そこを重点的に攻めたオナニーで1回寸止めする。",
"命令男26.オナニーの頻度と一番好きなオナニーのおかず・方法を告白する。その後、告白した方法でオナニーをして1回寸止めする。",
"命令男27.自分が思う一番惨めで恥ずかしく感じやすいオナニーの仕方を告白し、その方法で1回寸止めする。",
"命令男28.今まで経験した人数を告白してその回数寸止めする。",
"命令男29.今現在入室してる人の数寸止めする。",
"命令男30.今までやってきた回数寸止めする。"
];

const specialPainPunishItems = [
"苦痛罰1.乳首に洗濯バサミをつけ、1分間ひっぱりながら左右に捻る。",
"苦痛罰2.乳首に洗濯バサミをつけ、洗濯バサミを開かずに無理やり取る。",
"苦痛罰3.乳首に洗濯バサミをつけ、叩きおとす。",
"苦痛罰4.お尻に今まで入れたことないものを入れる。",
"苦痛罰5.歯磨き粉をつけた歯ブラシで乳首を磨く。",
"苦痛罰6.歯磨き粉をつけた歯ブラシでクリまたは亀頭を磨く。",
"苦痛罰7.歯磨き粉をつけた歯ブラシでオマンコまたはおちんぽを磨く",
"苦痛罰8.オマンコまたは玉を全力で10回叩く。",
"苦痛罰9.右のお尻を全力で10回叩く。",
"苦痛罰10.スリッパで右のお尻を全力で10回叩く。",
"苦痛罰11.お尻にバイブかローターを入れて強にしたまま四つん這いになり舌を出したままお家を1周する。",
"苦痛罰12.乳首を壁につけた状態で部屋を1周周る。",
"苦痛罰13.左のお尻を全力で10回叩く。",
"苦痛罰14.スリッパで左のお尻を全力で10回叩く。",
"苦痛罰15.【持続】乳首に洗濯バサミをつけたまま罰を行う。",
"苦痛罰16.【持続】玩具またはペンなどをオマンコとお尻にいれたまま罰を行う。",
"苦痛罰17.【持続】割る前の割り箸の間に乳首か舌を挟み空いてる側を輪ゴムで締めた状態で罰を行う。",
"苦痛罰18.【持続】これ以降空いてる時間は常にクリまたは亀頭を刺激しながら罰を行う。",
"苦痛罰19.乳首とクリまたは亀頭に刺激物を塗る。",
"苦痛罰20.おまんこまたはおちんぽに刺激物を塗る",
];
const femaleEventItems = [
"女イベント1.",
"女イベント2.",
"女イベント3.",
"女イベント4.",
"女イベント5.",
"女イベント6.",
"女イベント7.",
"女イベント8.",
"女イベント9.",
"女イベント10.",
"女イベント11.",
"女イベント12.",
"女イベント13.",
"女イベント14.",
"女イベント15.",
"女イベント16.",
"女イベント17.",
"女イベント18.",
"女イベント19.",
"女イベント20.",
"女イベント21.",
"女イベント22.",
"女イベント23.",
"女イベント24.",
"女イベント25.",
"女イベント26.",
"女イベント27.",
"女イベント28.",
"女イベント29.",
"女イベント30.",
];

const maleEventItems = [
"男イベント1.",
"男イベント2.",
"男イベント3.",
"男イベント4.",
"男イベント5.",
"男イベント6.",
"男イベント7.",
"男イベント8.",
"男イベント9.",
"男イベント10.",
"男イベント11.",
"男イベント12.",
"男イベント13.",
"男イベント14.",
"男イベント15.",
"男イベント16.",
"男イベント17.",
"男イベント18.",
"男イベント19.",
"男イベント20.",
"男イベント21.",
"男イベント22.",
"男イベント23.",
"男イベント24.",
"男イベント25.",
"男イベント26.",
"男イベント27.",
"男イベント28.",
"男イベント29.",
"男イベント30.",
];
const commonEventItems = [ 
"共通イベント1.", 
"共通イベント2.", 
"共通イベント3.", 
"共通イベント4.", 
"共通イベント5.", 
"共通イベント6.", 
"共通イベント7.", 
"共通イベント8.", 
"共通イベント9.", 
"共通イベント10.", 
"共通イベント11.", 
"共通イベント12.", 
"共通イベント13.", 
"共通イベント14.", 
"共通イベント15.", 
"共通イベント16.", 
"共通イベント17.", 
"共通イベント18.", 
"共通イベント19.", 
"共通イベント20.", 
"共通イベント21.", 
"共通イベント22.", 
"共通イベント23.", 
"共通イベント24.", 
"共通イベント25.", 
"共通イベント26.", 
"共通イベント27.", 
"共通イベント28.", 
"共通イベント29.", 
"共通イベント30.", 
];

function shuffle(a){ return a.sort(()=>Math.random()-0.5); }
let punishStockByRoom = {};
// ===== 罰累計（絶頂解放用） =====
let punishCountByRoom = {};
let zecchoUnlockedByRoom = {};
// ===== タイマー状態 =====
let roomTimerEndByRoom = {};
let roomTimerTimeoutByRoom = {};


function addPunishCount(room){

  if (!punishCountByRoom[room]){
    punishCountByRoom[room] = 0;
  }

  punishCountByRoom[room]++;

}
function isZecchoUnlocked(room){

  return (punishCountByRoom[room] || 0) >= 10;

}

// ===== 罰クールタイム（部屋単位） =====
let punishCooldownByRoom = {};
const PUNISH_COOLDOWN = 20 * 1000; // 20秒

function canUsePunish(room){

  const now = Date.now();
  const last = punishCooldownByRoom[room] || 0;

  if (now - last < PUNISH_COOLDOWN){
    return false;
  }

  punishCooldownByRoom[room] = now;
  return true;
}

function initPunishRoom(room){
  if (!punishStockByRoom[room]) {
    punishStockByRoom[room] = {
      girl: shuffle([...punishItems]),
      boy: shuffle([...boyPunishItems]),
      hitori: shuffle([...hitoriPunishItems]),
      onaGirl: shuffle([...onaGirlPunishItems]),
      onaBoy: shuffle([...onaBoyPunishItems]),
      pain: shuffle([...specialPainPunishItems]),
      maleEvent: shuffle([...maleEventItems]),
      femaleEvent: shuffle([...femaleEventItems]),
      commonEvent: shuffle([...commonEventItems]),

    };
  }
}
function getOnaGirlPunish(room){
  initPunishRoom(room);
  if (!punishStockByRoom[room].onaGirl.length)
    punishStockByRoom[room].onaGirl = shuffle([...onaGirlPunishItems]);
  return punishStockByRoom[room].onaGirl.shift();
}
function getOnaBoyPunish(room){
  initPunishRoom(room);
  if (!punishStockByRoom[room].onaBoy.length)
    punishStockByRoom[room].onaBoy = shuffle([...onaBoyPunishItems]);
  return punishStockByRoom[room].onaBoy.shift();
}
function getHitoriPunish(room){
  initPunishRoom(room);
  if (!punishStockByRoom[room].hitori.length)
    punishStockByRoom[room].hitori = shuffle([...hitoriPunishItems]);
  return punishStockByRoom[room].hitori.shift();
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
function getMaleEvent(room){
  initPunishRoom(room);
  if (!punishStockByRoom[room].maleEvent.length){
    punishStockByRoom[room].maleEvent =
      shuffle([...maleEventItems]);
  }
  return punishStockByRoom[room].maleEvent.shift();
}
function getFemaleEvent(room){
  initPunishRoom(room);
  if (!punishStockByRoom[room].femaleEvent.length){
    punishStockByRoom[room].femaleEvent =
      shuffle([...femaleEventItems]);
  }
  return punishStockByRoom[room].femaleEvent.shift();
}
function getCommonEvent(room){

  initPunishRoom(room);

  if (!punishStockByRoom[room].commonEvent.length){
    punishStockByRoom[room].commonEvent =
      shuffle([...commonEventItems]);
  }

  return punishStockByRoom[room].commonEvent.shift();

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
/* ===== ログ期限削除 ===== */
setInterval(() => {

  const now = Date.now();

  messagesLog = messagesLog.filter(
    m => now - (m.savedAt || now) < LOG_LIFETIME
  );

  saveLogs();

}, 60 * 60 * 1000); // 1時間ごと確認


/* ===============================
   ⚡ 電気椅子 3部屋管理（追加）
================================ */

function createDenki(){
  return {
    players: [],
    turn: 0,
    phase: "set",
    trapSeat: null,
    sitSeat: null,
    sitPreview: null,
    ended: false,
    started: false
  };
}

let denkiRooms = {
  denki:  createDenki(),
  denki1: createDenki(),
  denki2: createDenki()
};

const DENKI_ROOM = "denki";
let denki = {
  players: [],
  turn: 0,
  phase: "set",
  trapSeat: null,
  sitSeat: null, 
  sitPreview: null, // ★ 仮座り用（追加）
  ended: false,        // ← 追加①：試合終了中か
};

function denkiState(){
  return {
    phase: denki.phase,
    ended: denki.ended,

    // shock になるまで仕掛け位置は非表示
    trapSeat: denki.phase === "shock" ? denki.trapSeat : null,

    sitSeat: denki.sitSeat,
    sitPreview: denki.sitPreview,

    // ★ 追加：使用済みイス一覧
    usedSeats: denki.players.flatMap(p =>
      (p.turns || []).filter(v => v !== "shock")
    ),

    players: denki.players.map((p,i)=>( {
      id: p.id,
      name: p.name,
      score: p.score,
      shock: p.shock,
      turns: p.turns || [],
      isTurn: denki.turn === i
    }))
  };
}




function resetDenki(){
  denki.phase = "set";
  denki.trapSeat = null;
  denki.sitSeat = null;
}


/* ===============================
   Socket.IO
================================ */
function denkiStateRoom(room){
  const game = denkiRooms[room];

  return {
    phase: game.phase,
    ended: game.ended,
    started: game.started,
    turn: game.turn,


    trapSeat: game.phase === "shock" ? game.trapSeat : null,
    sitSeat: game.sitSeat,
    sitPreview: game.sitPreview,
    usedSeats: game.players.flatMap(p =>
      (p.turns || []).filter(v => v !== "shock")
    ),
    players: game.players.map((p,i)=>({
      id: p.id,
      name: p.name,
      score: p.score,
      shock: p.shock,
      turns: p.turns || [],
      isTurn: game.turn === i
    }))
  };
}

/* ===============================
   Socket.IO
================================ */

io.on("connection", socket => {

socket.emit("lobbyUpdate", getLobbyInfo());

// ===== IP取得 =====
const rawIp =
  socket.handshake.headers["x-forwarded-for"] ||
  socket.handshake.address ||
  socket.conn.remoteAddress ||
  "unknown";

const ip =
  rawIp.split(",")[0].trim();


socket.on("lobbyUpdateRequest", () => {
  socket.emit("lobbyUpdate", getLobbyInfo());
});

// ===== タイマー開始 =====
socket.on("timerStart", ({ seconds }) => {

  const room = socket.room;
  if (!room) return;

  if (roomTimerEndByRoom[room]) {

    socket.emit("message", {
      name: "system",
      text: "タイマー作動中",
      room: room,
      time: getTimeString()
    });

    return;
  }

  const endTime =
    Date.now() + (seconds * 1000);

  roomTimerEndByRoom[room] = endTime;

  const startMsg = {
    name: "system",
    text: `${seconds/60}分タイマー開始`,
    room: room,
    time: getTimeString()
  };

  const log = normalizeLog(startMsg);

  adminLogs.push(log);
  roomLogs.push(log);

  saveLogs();

  io.to(room).emit("message", startMsg);
  io.to(room).emit("timerSync", { endTime });

  roomTimerTimeoutByRoom[room] =
    setTimeout(() => {

      delete roomTimerEndByRoom[room];
      delete roomTimerTimeoutByRoom[room];

      const endMsg = {
        name: "system",
        text: "タイマー終了",
        room: room,
        time: getTimeString()
      };

      const log = normalizeLog(endMsg);

      adminLogs.push(log);
      roomLogs.push(log);

      saveLogs();

      io.to(room).emit("message", endMsg);
      io.to(room).emit("timerEnd");

    }, seconds * 1000);

});

  socket.on("denkiStateRequest", () => {

  if (!["denki","denki1","denki2"].includes(socket.room)) return;

  const game = denkiRooms[socket.room];

  const player = game.players.find(
    p => p.name === socket.username
  );

  if (player) {
    player.id = socket.id;
  }

  io.to(socket.id).emit(
    "denkiState",
    denkiStateRoom(socket.room)
  );

});




/* ===== 個人ミュート（部屋＋名前） ===== */
socket.on("muteUser", targetId => {

  if (!socket.room) return;

  const room = socket.room;

  const me = socket.username;

  const targetUser =
    users.find(u => u.id === targetId);

  if (!targetUser) return;

  const targetName = targetUser.name;

  // ===== 初期化 =====
  if (!muteByRoom[room]) {
    muteByRoom[room] = {};
  }

  if (!muteByRoom[room][me]) {
    muteByRoom[room][me] = [];
  }

  const list = muteByRoom[room][me];

  // ===== 解除 =====
  if (list.includes(targetName)) {

    muteByRoom[room][me] =
      list.filter(n => n !== targetName);

    io.to(socket.id).emit(
      "muteSync",
      muteByRoom[room][me]
    );

    return;
  }

  // ===== ミュート追加 =====
  muteByRoom[room][me].push(targetName);

  const msg = {
    name: "system",
    text: `${me} が ${targetName} をミュートしました`,
    room: room,
    time: getTimeString()
  };

  const log = normalizeLog(msg);

  adminLogs.push(log);
  roomLogs.push(log);

  saveLogs();

  io.to(room).emit("message", msg);

  // ===== 同期 =====
  io.to(socket.id).emit(
    "muteSync",
    muteByRoom[room][me]
  );

});



    /* ===== 文字色更新 ===== */
  socket.on("updateColor", ({ color }) => {
    const u = users.find(u => u.id === socket.id);
    if (!u) return;

    u.color = color;

    io.to(u.room).emit(
      "userList",
      users.filter(x => x.room === u.room)
    );
  });

socket.on("denkiSitConfirm", () => {

  if (!["denki","denki1","denki2"].includes(socket.room)) return;

  const game = denkiRooms[socket.room];

  if (game.phase !== "sit") return;

  const victimIndex = game.turn === 0 ? 1 : 0;
  const victim = game.players[victimIndex];
  if (!victim || victim.id !== socket.id) return;

  if (game.sitPreview == null) return;
game.sitSeat = game.sitPreview;
game.sitPreview = null;
game.phase = "shock";


// ===== 座り確定ログ =====
const sitMsg = {
  name: "system",
  text: `${victim.name} が決定しました`,
  room: socket.room,
  time: getTimeString()
};

const sitLog =
  normalizeLog(sitMsg);

adminLogs.push(sitLog);
roomLogs.push(sitLog);

saveLogs();

io.to(socket.room).emit("message", sitMsg);

io.to(socket.room).emit(
  "denkiState",
  denkiStateRoom(socket.room)
);


});




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
socket.on("join", ({
  name,
  color="black",
  room="room1",
  connectKey
}) => {


  // ===== BAN =====
  if (bans[name] && bans[name] > Date.now()) {
    socket.emit("message", {
      name:"system",
      text:"BAN中のため入室できません",
      room,
      time:getTimeString()
    });
    socket.disconnect(true);
    return;
  }
  // ===== IP BAN =====
if (ipBans[ip] && ipBans[ip] > Date.now()) {

  socket.emit("message", {
    name:"system",
    text:"IP BAN中のため入室できません",
    room,
    time:getTimeString()
  });

  socket.disconnect(true);
  return;
}

// ===== room6 入室制限 =====
const ngNames = ["見学","観戦","ROM"];

if (room === "room6") {

  // ===== NGワード =====
  const hasNgWord =
    ngNames.some(w => name.includes(w));

  // ===== 1文字禁止 =====
  const isOneChar =
    name.length <= 1;

  if (hasNgWord || isOneChar) {

    socket.emit("message", {
      name: "system",
      text: "この部屋は見学・短名入室できません",
      room,
      time: getTimeString()
    });

    socket.disconnect(true);
    return;
  }

}
// ===== 同名検索 =====
const existingUser =
  users.find(u =>
    u.name === name &&
    u.room === room
  );

// ===== 同名チェック =====
if (existingUser) {

  // ===== 接続キー一致 → 復帰 =====
  if (
    existingUser.connectKey &&
    existingUser.connectKey === connectKey
  ){

    const oldSocket =
      io.sockets.sockets.get(existingUser.id);

    if (oldSocket){
      oldSocket.disconnect(true);
    }

    existingUser.id = socket.id;
    existingUser.lastActive = Date.now();

  }
  else {

    socket.emit("message", {
      name:"system",
      text:"同じ名前の人がいます",
      room,
      time:getTimeString()
    });

    socket.disconnect(true);
    return;

  }

} else {

  users.push({
    id: socket.id,
    name,
    color,
    room,
    connectKey,
    ip,
    lastActive: Date.now()
  });

}

  

  


  // ===== ここで初めて入室 =====
  socket.username = name;
  socket.room = room;
  socket.join(room);
  // ===== 空室削除タイマー停止 =====
if (emptyRoomTimers[room]){

  clearTimeout(
    emptyRoomTimers[room]
  );

  delete emptyRoomTimers[room];

}


  io.to(room).emit(
    "userList",
    users.filter(u=>u.room===room)
  );
io.emit("lobbyUpdate", getLobbyInfo());



socket.emit(
  "pastMessages",
  roomLogs.filter(m =>
    m.room === room &&
    (!m.private || m.to === socket.id || m.from === socket.id)
  )
);
// ===== タイマー途中同期 =====
if (roomTimerEndByRoom[room]) {

  socket.emit("timerSync", {
    endTime: roomTimerEndByRoom[room]
  });

}

// ===== 絶頂解放状態同期 =====
if (zecchoUnlockedByRoom[room]) {
  socket.emit("zecchoUnlock");
}

  io.emit("lobbyUpdate", getLobbyInfo());
  // ===== ミュート同期（入室時） =====
if (
  muteByRoom[room] &&
  muteByRoom[room][name]
) {
  socket.emit(
    "muteSync",
    muteByRoom[room][name]
  );
}
else {
  socket.emit("muteSync", []);
}


});





/* ===== 電気椅子参加 ===== */
socket.on("denkiJoin", () => {

  if (!["denki","denki1","denki2"].includes(socket.room)) return;

  const game = denkiRooms[socket.room];

  const existing = game.players.find(
    p => p.name === socket.username
  );

  if (existing) {
    existing.id = socket.id;

    io.to(socket.room).emit(
      "denkiState",
      denkiStateRoom(socket.room)
    );

    return;
  }

  if (game.players.length >= 2) return;

  const user = users.find(u => u.id === socket.id);
  if (!user) return;

  game.players.push({
    id: socket.id,
    name: user.name,
    score: 0,
    shock: 0,
    turns: []
  });

  io.to(socket.room).emit(
    "denkiState",
    denkiStateRoom(socket.room)
  );

if (game.players.length === 2) {

  // ===== 終了後リセット =====
  if (game.ended) {

    game.players.forEach(p => {
      p.score = 0;
      p.shock = 0;
      p.turns = [];
    });

    game.turn = 0;
    game.phase = "set";
    game.trapSeat = null;
    game.sitSeat = null;
    game.sitPreview = null;
    game.ended = false;
    game.started = false;

  }

  // ===== 開始 =====
  if (!game.started) {

    game.turn = 0;
    game.phase = "set";
    game.trapSeat = null;
    game.sitSeat = null;
    game.sitPreview = null;

    game.started = true;

    const startMsg = {
      name: "system",
      text: `⚡ 勝負開始！ ${game.players[0].name} vs ${game.players[1].name}`,
      room: socket.room,
      time: getTimeString()
    };

    const log = normalizeLog(startMsg);

    adminLogs.push(log);
    roomLogs.push(log);

    saveLogs();

    io.to(socket.room).emit("message", startMsg);
    io.to(socket.room).emit(
  "denkiState",
  denkiStateRoom(socket.room)
);


  }

}


});


 socket.on("denkiSet", seat => {

  if (!["denki","denki1","denki2"].includes(socket.room)) return;

  const game = denkiRooms[socket.room];

  if (game.phase !== "set") return;
  if (!game.started) return;


  const me = game.players[game.turn];
if (!me || me.id !== socket.id) return;

game.trapSeat = seat;

// ★ 即座に座りフェーズにしない
setTimeout(() => {

  game.phase = "sit";

  io.to(socket.room).emit(
    "denkiState",
    denkiStateRoom(socket.room)
  );

}, 300);



// ===== 仕掛けましたログ =====
const setMsg = {
  name: "system",
  text: `${me.name} が仕掛けました`,
  room: socket.room,
  time: getTimeString()
};

const setLog =
  normalizeLog(setMsg);

adminLogs.push(setLog);
roomLogs.push(setLog);

saveLogs();

io.to(socket.room)
  .emit("message", setMsg);

io.to(socket.room).emit(
  "denkiState",
  denkiStateRoom(socket.room)
);

});

socket.on("denkiSit", seat => {

  if (!["denki","denki1","denki2"].includes(socket.room)) return;

  const game = denkiRooms[socket.room];

  if (game.phase !== "sit") return;
  if (!game.started) return;


  // 座る側 = turnじゃない方
  const victimIndex = game.turn === 0 ? 1 : 0;
  const victim = game.players[victimIndex];
  if (!victim || victim.id !== socket.id) return;

  game.sitPreview = seat;



  io.to(socket.room).emit(
    "denkiState",
    denkiStateRoom(socket.room)
  );
});

socket.on("denkiShock", () => {

  if (!["denki","denki1","denki2"].includes(socket.room)) return;

  const game = denkiRooms[socket.room];

  if (game.phase !== "shock") return;
  if (!game.started) return;


  const attacker = game.players[game.turn];
  if (!attacker || attacker.id !== socket.id) return;

  const victimIndex = game.turn === 0 ? 1 : 0;
  const victim = game.players[victimIndex];
  if (!victim) return;


  let text;
  let color;

// ===== 判定 =====
const trap = game.trapSeat;
const sit  = game.sitSeat;

if (sit === trap) {

  victim.score = 0;
  victim.shock += 1;
  victim.turns = victim.turns || [];
  victim.turns.push("shock");

  text = `⚡ 電流！${victim.name} は0点（仕掛け：${trap} / 座った：${sit}）`;
  color = "red";

} else {

  victim.turns = victim.turns || [];
  victim.turns.push(sit);

  victim.score += sit;

  text = `👼 セーフ！${victim.name} は${sit}点（仕掛け：${trap} / 座った：${sit}）`;
  color = "green";
}


// ===== チャット表示 =====
const msg = {
  name: "system",
  text: text,
  color: color,
  room: socket.room,
  time: getTimeString()
};

const log = normalizeLog(msg);

adminLogs.push(log);
roomLogs.push(log);

saveLogs();

io.to(socket.room).emit("message", msg);

// ===== 残り1イス判定 =====
const TOTAL_SEATS = 12;

const usedSeats = game.players.flatMap(p =>
  (p.turns || []).filter(v => v !== "shock")
);
if (usedSeats.length >= TOTAL_SEATS - 1) {

  const p1 = game.players[0];
  const p2 = game.players[1];

  let resultText;

  if (p1.score > p2.score) {
    resultText = `🏁 イス残り1：勝者 ${p1.name}（${p1.score}点）`;
  }
  else if (p2.score > p1.score) {
    resultText = `🏁 イス残り1：勝者 ${p2.name}（${p2.score}点）`;
  }
  else {
    resultText = `🏁 イス残り1：引き分け（${p1.score}点）`;
  }

  const resultMsg = {
    name: "system",
    text: resultText,
    room: socket.room,
    time: getTimeString()
  };

  const log = normalizeLog(resultMsg);

adminLogs.push(log);
roomLogs.push(log);

saveLogs();

io.to(socket.room).emit("message", resultMsg);


  game.ended = true;
  game.phase = "end";
 setTimeout(() => {

  // ===== players リセット =====
  game.players = [];

  game.turn = 0;
  game.trapSeat = null;
  game.sitSeat = null;
  game.sitPreview = null;
  game.started = false;

  io.to(socket.room).emit(
    "denkiState",
    denkiStateRoom(socket.room)
  );

}, 3000);


  io.to(socket.room).emit(
    "denkiState",
    denkiStateRoom(socket.room)
  );

  return;
}

 // ===== 勝利条件チェック =====

// 合計点
const p1 = game.players[0];
const p2 = game.players[1];

const score1 = p1.score;
const score2 = p2.score;

let resultText = null;

// ===== ① 40点到達 =====
if (score1 >= 40) {
  resultText = `🏆 勝者：${p1.name}（${score1}点）`;
}
if (score2 >= 40) {
  resultText = `🏆 勝者：${p2.name}（${score2}点）`;
}

// ===== ② 電気3回 =====
if (p1.shock >= 3) {
  resultText = `💀 敗北：${p1.name}（⚡3回）／ 勝者：${p2.name}`;
}
if (p2.shock >= 3) {
  resultText = `💀 敗北：${p2.name}（⚡3回）／ 勝者：${p1.name}`;
}

// ===== ③ 10ターン終了 =====
const turns1 = (p1.turns || []).length;
const turns2 = (p2.turns || []).length;

if (turns1 >= 10 && turns2 >= 10) {

  if (score1 > score2) {
    resultText = `🏁 10ターン終了：勝者 ${p1.name}（${score1}点）`;
  }
  else if (score2 > score1) {
    resultText = `🏁 10ターン終了：勝者 ${p2.name}（${score2}点）`;
  }
  else {
    resultText = `🏁 10ターン終了：引き分け（${score1}点）`;
  }
}

// ===== 終了処理 =====
if (resultText) {

  const resultMsg = {
    name: "system",
    text: resultText,
    room: socket.room,
    time: getTimeString()
  };

  const log = normalizeLog(resultMsg);

adminLogs.push(log);
roomLogs.push(log);

saveLogs();

io.to(socket.room).emit("message", resultMsg);


  game.ended = true;
  game.phase = "end";
  setTimeout(() => {

  // ===== players リセット =====
  game.players = [];

  game.turn = 0;
  game.trapSeat = null;
  game.sitSeat = null;
  game.sitPreview = null;
  game.started = false;

  io.to(socket.room).emit(
    "denkiState",
    denkiStateRoom(socket.room)
  );

}, 3000);



  io.to(socket.room).emit(
    "denkiState",
    denkiStateRoom(socket.room)
  );

  return;
}
// ===== ラウンド終了処理 =====
game.turn = game.turn === 0 ? 1 : 0;

game.phase = "set";

game.trapSeat   = null;
game.sitSeat    = null;
game.sitPreview = null;

io.to(socket.room).emit(
  "denkiState",
  denkiStateRoom(socket.room)
);

return;
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
     const log = normalizeLog(msg);

adminLogs.push(log);
roomLogs.push(log);

saveLogs();

io.to(socket.room).emit("message",msg);
return;


      return;
    }
if(text==="女子罰"){

  if (!canUsePunish(socket.room)){
    socket.emit("message",{
      name:"system",
      text:"罰は20秒に1回まで",
      room:socket.room,
      time:getTimeString()
    });
    return;
  }

  const msg={
  name: socket.username,
  text: getGirlPunish(socket.room),
  color: "red",
  bold: true,
  room: socket.room,
  time: getTimeString(),
  from: socket.id
};


const log = normalizeLog(msg);

adminLogs.push(log);
roomLogs.push(log);

saveLogs();

io.to(socket.room).emit("message", msg);

  addPunishCount(socket.room);
// ===== 絶頂解放判定 =====
if (
  isZecchoUnlocked(socket.room) &&
  !zecchoUnlockedByRoom[socket.room]
){
  zecchoUnlockedByRoom[socket.room] = true;

  const sysMsg = {
    name: "system",
    text: "絶頂許可が解放されました",
    bold: true,
    color: "black",
    room: socket.room,
    time: getTimeString()
  };

  const log = normalizeLog(sysMsg);

adminLogs.push(log);
roomLogs.push(log);

saveLogs();

io.to(socket.room).emit("message", sysMsg);

  io.to(socket.room).emit("zecchoUnlock");

}

  return;
}

if(text==="男子罰"){

  if (!canUsePunish(socket.room)){
    socket.emit("message",{
      name:"system",
      text:"罰は20秒に1回まで",
      room:socket.room,
      time:getTimeString()
    });
    return;
  }

 const msg={
  name: socket.username,
  text: getBoyPunish(socket.room),
  color: "blue",
  bold: true,
  room: socket.room,
  time: getTimeString(),
  from: socket.id
};


const log = normalizeLog(msg);

adminLogs.push(log);
roomLogs.push(log);

saveLogs();

io.to(socket.room).emit("message", msg);

  addPunishCount(socket.room);
// ===== 絶頂解放判定 =====
if (
  isZecchoUnlocked(socket.room) &&
  !zecchoUnlockedByRoom[socket.room]
){
  zecchoUnlockedByRoom[socket.room] = true;

  const sysMsg = {
    name: "system",
    text: "絶頂許可が解放されました",
    bold: true,
    color: "black",
    room: socket.room,
    time: getTimeString()
  };

  const log = normalizeLog(sysMsg);

adminLogs.push(log);
roomLogs.push(log);

saveLogs();

io.to(socket.room).emit("message", sysMsg);

  io.to(socket.room).emit("zecchoUnlock");

}


  return;
}

if(text==="命令女"){

  if (!canUsePunish(socket.room)){
    socket.emit("message",{
      name:"system",
      text:"罰は20秒に1回まで",
      room:socket.room,
      time:getTimeString()
    });
    return;
  }

  const msg={
  name: socket.username,
  text: getOnaGirlPunish(socket.room),
  color: "deeppink",
  bold: true,
  room: socket.room,
  time: getTimeString(),
  from: socket.id
};

  const log = normalizeLog(msg);

adminLogs.push(log);
roomLogs.push(log);

saveLogs();

io.to(socket.room).emit("message", msg);

  addPunishCount(socket.room);
// ===== 絶頂解放判定 =====
if (
  isZecchoUnlocked(socket.room) &&
  !zecchoUnlockedByRoom[socket.room]
){
  zecchoUnlockedByRoom[socket.room] = true;

  const sysMsg = {
    name: "system",
    text: "絶頂許可が解放されました",
    bold: true,
    color: "black",
    room: socket.room,
    time: getTimeString()
  };

  const log = normalizeLog(sysMsg);

adminLogs.push(log);
roomLogs.push(log);

saveLogs();

io.to(socket.room).emit("message", sysMsg);

  io.to(socket.room).emit("zecchoUnlock");

}


  return;
}
if(text==="命令男"){

  if (!canUsePunish(socket.room)){
    socket.emit("message",{
      name:"system",
      text:"罰は20秒に1回まで",
      room:socket.room,
      time:getTimeString()
    });
    return;
  }

  const msg={
  name: socket.username,
  text: getOnaBoyPunish(socket.room),
  color: "navy",
  bold: true,
  room: socket.room,
  time: getTimeString(),
  from: socket.id
};


  const log = normalizeLog(msg);

adminLogs.push(log);
roomLogs.push(log);

saveLogs();

io.to(socket.room).emit("message", msg);

  addPunishCount(socket.room);
// ===== 絶頂解放判定 =====
if (
  isZecchoUnlocked(socket.room) &&
  !zecchoUnlockedByRoom[socket.room]
){
  zecchoUnlockedByRoom[socket.room] = true;

  const sysMsg = {
    name: "system",
    text: "絶頂許可が解放されました",
    bold: true,
    color: "black",
    room: socket.room,
    time: getTimeString()
  };

  const log = normalizeLog(sysMsg);

adminLogs.push(log);
roomLogs.push(log);

saveLogs();

io.to(socket.room).emit("message", sysMsg);

  io.to(socket.room).emit("zecchoUnlock");
}
  return;
}

if(text==="苦痛罰"){

  if (!canUsePunish(socket.room)){
    socket.emit("message",{
      name:"system",
      text:"罰は20秒に1回まで",
      room:socket.room,
      time:getTimeString()
    });
    return;
  }

  const msg={
  name: socket.username,
  text: getPainPunish(socket.room),
  color: "purple",
  bold: true,
  room: socket.room,
  time: getTimeString(),
  from: socket.id
};


  const log = normalizeLog(msg);

adminLogs.push(log);
roomLogs.push(log);

saveLogs();

io.to(socket.room).emit("message", msg);

  addPunishCount(socket.room);
// ===== 絶頂解放判定 =====
if (
  isZecchoUnlocked(socket.room) &&
  !zecchoUnlockedByRoom[socket.room]
){
  zecchoUnlockedByRoom[socket.room] = true;

  const sysMsg = {
    name: "system",
    text: "絶頂許可が解放されました",
    bold: true,
    color: "black",
    room: socket.room,
    time: getTimeString()
  };

  const log = normalizeLog(sysMsg);

adminLogs.push(log);
roomLogs.push(log);

saveLogs();

io.to(socket.room).emit("message", sysMsg);

  io.to(socket.room).emit("zecchoUnlock");

}

  return;
}

if (text === "絶頂許可") {

  // ===== 解放中じゃなければ無効 =====
  if (!zecchoUnlockedByRoom[socket.room]) {
    return;
  }

  const msg = {
    name: socket.username,
    text: getHitoriPunish(socket.room),
    color: "gray",
    bold: true,
    room: socket.room,
    time: getTimeString(),
    from: socket.id
  };

  const log = normalizeLog(msg);

  adminLogs.push(log);
  roomLogs.push(log);

  saveLogs();

  io.to(socket.room).emit("message", msg);

  // ===== 累計リセット =====
  punishCountByRoom[socket.room] = 0;

  // ===== 解放フラグOFF =====
  zecchoUnlockedByRoom[socket.room] = false;

  // ===== ボタン非表示送信 =====
  io.to(socket.room).emit("zecchoHide");

  return;
}

// ===== 男イベント =====
if (text === "男イベント") {

  const item = getMaleEvent(socket.room);

  const msg = {
  name: socket.username,
  text: item,
  room: socket.room,
  bold: true,
  time: getTimeString()
};


  io.to(socket.room).emit("message", msg);

  messagesLog.push(normalizeLog(msg));
  saveLogs();

  return;
}

// ===== 女イベント =====
if (text === "女イベント") {

  const item = getFemaleEvent(socket.room);

  const msg = {
  name: socket.username,
  text: item,
  room: socket.room,
  bold: true,
  time: getTimeString()
};


  io.to(socket.room).emit("message", msg);

  messagesLog.push(normalizeLog(msg));
  saveLogs();

  return;
}
// ===== 共通イベント =====
if (text === "共通イベント") {

  const item =
    getCommonEvent(socket.room);

  const msg = {
  name: socket.username,
  text: item,
  room: socket.room,
  bold: true,
  time: getTimeString()
};


  io.to(socket.room).emit("message", msg);

  messagesLog.push(
    normalizeLog(msg)
  );

  saveLogs();

  return;
}



 
    
if (data.to) {

  const targetUser =
    users.find(u => u.id === data.to);

  const sender =
    users.find(u => u.id === socket.id);

  const msg = {
    name: socket.username,
    text,
    room: socket.room,
    time: getTimeString(),
    private: true,
    to: data.to,
    from: socket.id,
    toName: targetUser?.name || "不明",

    // ★ 追加
    color: sender?.color || "black"
  };

  const log = normalizeLog(msg);

  adminLogs.push(log);
  roomLogs.push(log);

  saveLogs();

  io.to(socket.room).emit("message", msg);

  return;
}



const u = users.find(x => x.id === socket.id);

const msg = {
  name: socket.username,
  text,
  color: data.color || u?.color,
  room: socket.room,
  time: getTimeString(),
  from: socket.id
};

  const log = normalizeLog(msg);

adminLogs.push(log);
roomLogs.push(log);

saveLogs();

io.to(socket.room).emit("message",msg);

  });

   socket.on("leave",()=>socket.disconnect(true));
  socket.on("disconnect",()=>{
    if (!socket.room) return;

    const leftRoom = socket.room;

    users = users.filter(u => u.id !== socket.id);

setTimeout(() => {

 if (leftRoom) {

  const stillUsers =
    users.filter(u => u.room === leftRoom);

  if (stillUsers.length === 0) {

    // ===== 10分後削除タイマー =====
    emptyRoomTimers[leftRoom] =
      setTimeout(() => {

        const checkUsers =
          users.filter(
            u => u.room === leftRoom
          );

        if (checkUsers.length === 0) {

          // ===== 部屋ログ削除 =====
          roomLogs =
            roomLogs.filter(
              m => m.room !== leftRoom
            );

          // ===== 罰系リセット =====
          delete punishStockByRoom[leftRoom];
          delete punishCooldownByRoom[leftRoom];
          delete punishCountByRoom[leftRoom];
          delete zecchoUnlockedByRoom[leftRoom];

          // ===== 電気椅子リセット =====
          if (
            ["denki","denki1","denki2"]
              .includes(leftRoom)
          ){
            denkiRooms[leftRoom] =
              createDenki();
          }

        }

      }, EMPTY_DELETE_TIME);

  }

}


  io.emit("lobbyUpdate", getLobbyInfo());

}, 100);

  });   // ← disconnect 閉じ
});     // ← io.on("connection") 閉じ


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
