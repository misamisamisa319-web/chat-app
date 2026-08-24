import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get(["/room2", "/room3"], (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

app.use(express.static("public"));

const users = [];
const viewers = {};

// ===== チャットログ（最新30件） =====
const chatLogs = [];
const MAX_CHAT_LOGS = 30;
const roomChatLogs = {};

// ===== 女性用・男性用 命令リスト =====


const toyCommands = [
  "M玩具01.好きな体勢で1分間（60-180）回ペースでクリをスリスリする。",
  "M玩具02.好きな体勢で1分間（60-180）回ペースでクリを指で挟んでシコシコする。",
  "M玩具03.好きな体勢で1分間（60-180）回ペースでオマンコに指を出し入れする。",
  "M玩具04.好きな体勢で1分間（60-180）回ディルドorバイブで、出し入れする。",
  "M玩具05.好きな体勢で1分間（弱-中-強）で（ローター-電マ）をクリに当てる。",
  "M玩具06.ガニ股で1分間（60-180）回ペースでクリをスリスリする。",
  "M玩具07.ガニ股で1分間（60-180）回ペースでクリを指で挟んでシコシコする。",
  "M玩具08.ガニ股で1分間（60-180）回ペースでオマンコに指を出し入れする。",
  "M玩具09.ガニ股で1分間（60-180）回ディルドorバイブで、出し入れする。",
  "M玩具10.ガニ股で1分間（弱-中-強）で（ローター-電マ）をクリに当てる。",
  "M玩具11.四つん這いで1分間（60-180）回ペースでクリをスリスリする。",
  "M玩具12.四つん這いで1分間（60-180）回ペースでクリを指で挟んでシコシコする。",
  "M玩具13.四つん這いで1分間（60-180）回ペースでオマンコに指を出し入れする。",
  "M玩具14.四つん這いで1分間（60-180）回ディルドorバイブで、出し入れする。",
  "M玩具15.四つん這いで1分間（弱中強）でローターをクリに当てる。",
  "M玩具16.M字開脚して1分間（60-180）回ペースでクリをスリスリする。",
  "M玩具17.M字開脚して1分間（60-180）回ペースでクリを指で挟んでシコシコする。",
  "M玩具18.M字開脚して1分間（60-180）回ペースでオマンコに指を出し入れする。",
  "M玩具19.M字開脚して1分間（60-180）回ディルドorバイブで、出し入れする。",
  "M玩具20.M字開脚して1分間（弱-中-強）で（ローター-電マ）をクリに当てる。",
  "M玩具21.座って足に力を入れてピンと貼りながら1分間（60-180）回ペースでクリをスリスリする。",
  "M玩具22.座って足に力を入れてピンと貼りながら1分間（60-180）回ペースでクリを指で挟んでシコシコする。",
  "M玩具23.座って足に力を入れてピンと貼りながら1分間（60-180）回ペースでオマンコに指を出し入れする。",
  "M玩具24.座って足に力を入れてピンと貼りながら1分間（60-180）回ディルドorバイブで、出し入れする。",
  "M玩具25.座って足に力を入れてピンと貼りながら1分間（弱-中-強）で（ローター-電マ）をクリに当てる。",
  "M玩具26.☆1.指示者の好きなやり方で1分間（60-180）回ペースで乳首を弄る。",
  "M玩具27.☆2.一番好きなオナニーの仕方を告白して1分間全力オナニー",
  "M玩具28.☆3.マングリ返しで1分間オナニーさせる。",
  "M玩具29.☆4.ぺったんこ座りで1分間（弱-中-強）で（ローター-電マ）に押し付ける。ローターか電マを持ってない場合は一番好きな性感帯を報告して全力オナニー。",
  "M玩具30.☆5.犬のチンチンポーズ+舌を出して1分間オナニーする。"
];

const girlCommands = [
  "女子用1.乳首に触れないように乳輪を指でくるくるなぞる3分間。",
  "女子用2.乳頭を薬指でふれるかふれないかの位置で上下にスリスリする3分間。",
  "女子用3.乳首をコリコリする3分間。",
  "女子用4.乳首を親指と中指でコリコリ潰しながら人差し指でスリスリ3分間する。",
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

// ===== 指示用6カテゴリ =====

const stopCommands = [
  "寸止め01.全力オナニー3分、その後1d3回寸止め。",
  "寸止め02.1回寸止め後、ゆっくりでも止めないで1分続ける。", 
  "寸止め03.参加者の人数分寸止めする。", 
  "寸止め04.性感帯を告白し、そこを重点的に攻めたオナニーで1回寸止めする。", 
  "寸止め05.今まで経験した人数を告白してその回数寸止めする。",
  "寸止め06.一番好きなオナニーの仕方を告白、そのやり方で1d3回行う。", 
  "寸止め07.寸止め5回、休憩を最小で行う。", 
  "寸止め08.いきそうになったら「いく」と宣言をして1分以上イキ我慢をする。", 
  "寸止め09.寸止め5回、終わる前に入室者が来たらはじめからやり直し。", 
  "寸止め10.寸止め10回、ただし部屋上げで5回、部屋上げおねだりで3回に減らして良い。"
];

const onaCommands = [
  "オナ01.1秒に1往復ペース（60）で3分間オナニーする。", 
  "オナ02.1秒に2往復ペース（120）で3分間オナニーする。", 
  "オナ03.1秒に3往復ペース（180）で3分間オナニーする。", 
  "オナ04.実況しながらオナニーを3分間する。", 
  "オナ05.いくいくと言葉に出しながら3分間する。",
  "オナ06.直近一週間のオナニー回数を告白。その中の一つの方法で3分間オナニーする。", 
  "オナ07.一番好きなオナニー方法を告白。その方法で3分間オナニーする。", 
  "オナ08.性感帯を告白し、そこを重点的に攻めたオナニーをし、「性感帯好き」と口に出しながら3分間する。", 
  "オナ09.ガニ股で立ちクリに当たるか当たらないかの位置に人差し指と中指を動かさないように置いて、それに腰ヘコしながらクリを刺激する3分間", 
  "オナ10.全力オナニー3分間。"
];

const nippleCommands = [
  "乳首01.乳首に触れないように乳輪を指でくるくるなぞる1分間。", 
  "乳首02.乳頭を薬指でふれるかふれないかの位置で上下にスリスリする1分間。", 
  "乳首03.乳首をコリコリする1分間。", 
  "乳首04.乳首を親指と中指でコリコリ潰しながら人差し指でスリスリ1分間する。", 
  "乳首05.乳首を親指と中指でコリコリ潰しながら人差し指の爪でカリカリ1分間する。",
  "乳首06.乳首を指三本ですり潰すように弄る1分間。", 
  "乳首07.乳首を摘んで引っ張りながらコリコリ1分間する。", 
  "乳首08.乳首にデコピン1d5+5回する。", 
  "乳首09.乳首の直径を計って報告する。", 
  "乳首10.乳首にメンソレータムをぬって3分間塗り込む、もしない場合は愛液を塗る。"
];

const rotorCommands = [
  "ローター01.コードを摘んでぶら下げて当てる（コードがない場合は触れるか触れないかで当てる）3分間する。", 
  "ローター02.クッションかタオルを丸めたものの上に置いて跨り押し付ける3分間する。", 
  "ローター03.クリの裏側をグリグリ押し当てながら3分間する。", 
  "ローター04.クリの先端だけに当てながら3分間する。", 
  "ローター05.中に入れたまま3分間する。",
  "ローター06.膝立ちでクリに押し当てながら3分間する。", 
  "ローター07.M字でクリに押し当てながら3分間する。", 
  "ローター08.四つん這いでクリに押し当て、お尻を振りながら3分間する。", 
  "ローター09.ガニ股で立ちクリに当たるか当たらないかの位置にローターを置いて、それに腰ヘコしながらクリを刺激する3分間", 
  "ローター10.自分が恥ずかしいと思うポーズを取ってクリに3分当て続ける。"
];

const vibeCommands = [
  "バイブ01.1秒に1往復ペース（60）で入口から奥まで3分間ズボズボする。", 
  "バイブ02.自分の一番気持ちいいスピードで3分間ズボズボする。", 
  "バイブ03.奥をグリグリ押し当てながら3分間ズボズボする。", 
  "バイブ04.入口だけ3分間ズボズボする。", 
  "バイブ05.自分が一番恥ずかしいと思うポーズで3分間ズボズボする。",
  "バイブ06.膝立ちで3分間ズボズボする。", 
  "バイブ07.M字で「私のここみてください」と言いながら3分間ズボズボする。", 
  "バイブ08.四つん這いになりながら3分間ズボズボする。", 
  "バイブ09.ガニ股で立ちながら3分間ズボズボする。", 
  "バイブ10.全力で3分間ズボズボする。"
];

const makikomiCommands = [
  "巻き込み01.同性1名、次の指示を1回一緒に行う。", 
  "巻き込み02.同性全員、次の指示を1回一緒に行う。", 
  "巻き込み03.異性1名、次の指示を1回一緒に行う。", 
  "巻き込み04.異性全員、次の指示を1回一緒に行う。", 
  "巻き込み05.1人指名して1d5を振って指名された人が負けたら負けた人のダイスの数一緒に行う。指名された人が勝った場合負けた人のダイスの数寸止めする。",
  "巻き込み06.1人指名して1d5を振って指名された人が負けたら負けた人のダイスの数一緒に行う。指名された人が勝った場合負けた人のダイスの数寸止めする。", 
  "巻き込み07.同性1名指名してその後一緒に解放まで行う。", 
  "巻き込み08.同性1名指名してその後一緒に解放まで行う。", 
  "巻き込み09.同性1名指名してその後一緒に解放まで行う。", 
  "巻き込み10.同性全員一緒に解放まで行う。"
];

const specialCommands = [
  "解放01.1回絶頂して解放！",
  "解放02.好きな回数絶頂して解放！",
  "解放03.見学者と1d5ダイス勝負して勝ったら解放負けたら負けたダイス分寸止め",
  "解放04.今まで寸止めした回数を正解できたら好きな回数絶頂して解放！",
  "解放05.今まで連続で絶頂したことある回数を告白してその回数絶頂して解放！"
];

// ===== 命令抽選ストック =====

function getInstructionCommand(type) {

  const lists = {
    寸止め: stopCommands,
    オナ: onaCommands,
    乳首: nippleCommands,
    ローター: rotorCommands,
    バイブ: vibeCommands,
    巻き込み: makikomiCommands
  };

  const list = lists[type];

  if (!list || list.length === 0) {
    return null;
  }

  return list[
    Math.floor(Math.random() * list.length)
  ];
}

function getSpecialCommand() {

  if (specialCommands.length === 0) {
    return null;
  }

  return specialCommands[
    Math.floor(Math.random() * specialCommands.length)
  ];
}

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
let instructionCount = 0;

io.on("connection", socket => {

    // ===== タイマー =====
  socket.on("timerStart", data => {


    console.log("timerStart受信", data);
    
    const seconds = Number(data?.seconds);

    if (!Number.isFinite(seconds) || seconds <= 0) return;

    const endTime = Date.now() + (seconds * 1000);

    io.to(socket.room).emit("timerSync", { endTime });

    setTimeout(() => {
      io.to(socket.room).emit("timerEnd");
    }, seconds * 1000);
  });

socket.on("viewRoom", room => {
  const roomName = String(room || "room1");

  if (!viewers[roomName]) {
    viewers[roomName] = new Set();
  }

  viewers[roomName].add(socket.id);

  socket.emit("viewerCount", viewers[roomName].size);
});


  socket.on("join", data => {

    const name = String(data?.name || "").trim();

    if (!name) return;

    socket.username = name;
    socket.color = data?.color || "#000000";

    if (socket.room) {
  socket.leave(socket.room);
}

socket.room = String(data?.room || "room1");
socket.join(socket.room);
    console.log("入室確認:", socket.id, socket.room);

    if (viewers[socket.room]) {
  viewers[socket.room].delete(socket.id);
}

    if (!roomChatLogs[socket.room]) {
  roomChatLogs[socket.room] = [];
}

const oldUserIndex = users.findIndex(
  u =>
    u.connectKey === data?.connectKey &&
    u.room === socket.room
);

if (oldUserIndex !== -1) {
  users.splice(oldUserIndex, 1);
}

   users.push({
  id: socket.id,
  name: socket.username,
  color: socket.color,
  room: data?.room || "room1",
  connectKey: data?.connectKey
});

    io.to(socket.room).emit(
  "userList",
  users.filter(u => u.room === socket.room)
);

    socket.to(socket.room).emit("message", {
  name: "system",
  text: `${socket.username}さんが入室しました`,
  time: getTimeString()
  });
  });

  socket.emit("pastMessages", roomChatLogs[socket.room] || []);

  socket.on("updateColor", data => {

    socket.color = data?.color || "#000000";

    const user = users.find(
      u => u.id === socket.id
    );

    if (user) {
      user.color = socket.color;
    }

    io.to(socket.room).emit(
  "userList",
  users.filter(u => u.room === socket.room)
);
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

// ===== 指示抽選 =====

// ===== 指示の解放カウント =====

socket.on("instructionDraw", data => {

  const types = Array.isArray(data?.types)
    ? data.types
    : [];

  instructionCount++;

  console.log("指示カウント:", instructionCount);

  if (types.length === 0) return;

  const type =
    types[Math.floor(Math.random() * types.length)];

  const command =
    getInstructionCommand(type);

  if (!command) return;

  // ===== 絶頂解放確率 =====
  // 10回目 5%
  // 以降1回ごとに +5%
  // 解放されたらカウントをリセット
  const releaseRate =
    instructionCount >= 10
      ? Math.min((instructionCount - 9) * 5, 100)
      : 0;

  const canRelease =
    releaseRate > 0 &&
    Math.random() * 100 < releaseRate;

  if (canRelease) {

    const specialCommand = getSpecialCommand();

    if (specialCommand) {

      const specialMsg = {
        name: socket.username,
        text: specialCommand,
        color: "purple",
        time: getTimeString()
      };

      chatLogs.push(specialMsg);

      if (chatLogs.length > MAX_CHAT_LOGS) {
        chatLogs.shift();
      }

      io.to(socket.room).emit("message", specialMsg);

      // 解放されたらリセット
      instructionCount = 0;
    }
  }

  const msg = {
    name: socket.username,
    text: command,
    color: socket.color,
    time: getTimeString()
  };

if (!roomChatLogs[socket.room]) {
  roomChatLogs[socket.room] = [];
}

  roomChatLogs[socket.room].push(msg);

  if (roomChatLogs[socket.room].length > MAX_CHAT_LOGS) {
  roomChatLogs[socket.room].shift();
}

  io.to(socket.room).emit("message", msg);
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

      const diceMsg = {
  name: socket.username,
  text: `${count}d${sides}${bonus ? `+${bonus}` : ""} →（${rolls.join(",")}）＝${total}`,
  color: socket.color,
  time: getTimeString()
};

roomChatLogs[socket.room].push(diceMsg);

if (roomChatLogs[socket.room].length > MAX_CHAT_LOGS) {
  roomChatLogs[socket.room].shift();
}

io.to(socket.room).emit("message", diceMsg);

      return;
    }

    // ===== 命令 =====

if (text === "玩具用") {
  const command = getToyCommand();

  const commandMsg = {
  name: socket.username,
  text: command,
  color: "purple",
  time: getTimeString()
};

roomChatLogs[socket.room].push(commandMsg);

if (roomChatLogs[socket.room].length > MAX_CHAT_LOGS) {
  roomChatLogs[socket.room].shift();
}

io.to(socket.room).emit("message", commandMsg);

  return;
}    

if (text === "命令女") {
  const command = getGirlCommand();

  const commandMsg = {
  name: socket.username,
  text: command,
  color: "deeppink",
  time: getTimeString()
};

roomChatLogs[socket.room].push(commandMsg);

if (roomChatLogs[socket.room].length > MAX_CHAT_LOGS) {
  roomChatLogs[socket.room].shift();
}

io.to(socket.room).emit("message", commandMsg);

  return;
}

if (text === "命令男") {
  const command = getBoyCommand();

  const commandMsg = {
  name: socket.username,
  text: command,
  color: "deeppink",
  time: getTimeString()
};

roomChatLogs[socket.room].push(commandMsg);

if (roomChatLogs[socket.room].length > MAX_CHAT_LOGS) {
  roomChatLogs[socket.room].shift();
}

io.to(socket.room).emit("message", commandMsg);

  return;
}

if (text === "パーティー") {
  const command = getPartyCommand();

  const commandMsg = {
  name: socket.username,
  text: command,
  color: "deeppink",
  time: getTimeString()
};

roomChatLogs[socket.room].push(commandMsg);

if (roomChatLogs[socket.room].length > MAX_CHAT_LOGS) {
  roomChatLogs[socket.room].shift();
}

io.to(socket.room).emit("message", commandMsg);

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

if (!roomChatLogs[socket.room]) {
  roomChatLogs[socket.room] = [];
}

roomChatLogs[socket.room].push(msg);

if (roomChatLogs[socket.room].length > MAX_CHAT_LOGS) {
  roomChatLogs[socket.room].shift();
}

    io.to(socket.room).emit("message", msg);
  });

  socket.on("leave", () => {
    removeUser(socket);
  });

socket.on("disconnect", () => {
  for (const roomName in viewers) {
    viewers[roomName].delete(socket.id);
  }



});

});

function removeUser(socket) {

  const index = users.findIndex(
    u => u.id === socket.id
  );

  if (index === -1) return;

  const name = users[index].name;

  users.splice(index, 1);

  const roomUsers = users.filter(
  u => u.room === socket.room
);

if (roomUsers.length === 0) {
  roomChatLogs[socket.room] = [];
  instructionCount = 0;
}

  io.to(socket.room).emit(
  "userList",
  users.filter(u => u.room === socket.room)
);

  io.to(socket.room).emit("message", {
  name: "system",
  text: `${name}さんが退出しました`,
  time: getTimeString()
});
}

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});