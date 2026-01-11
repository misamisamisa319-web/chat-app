import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let users = [];
// 罰ゲーム30個
const punishItems = [
  "罰1.全裸になり脚を開き、人差し指と中指でクリトリスを軽く挟み込んで擦る。3分以内に100往復こする。できなかった場合、2分以内に100往復に続けて挑戦する。", 
  "罰2.カーテン全開の窓際に立ちクリトリスかおまんこへのオナニーを2分実施。", 
  "罰3.ローター(もしくは電マ)所持者はローター最強で2分クリにあてる。バイブ所持者はバイブ最強で1分間出し入れする。両方持っている場合はオナニー好きと判断し、ローター→バイブの順で休憩を挟まず両方実施。どちらも持っていない場合は洗濯挟みを舌につける。", 
  "罰4. 直近一週間のオナニー回数を告白。2回目は何を想像してオナニーしたかを告白。3回目はそのやり方を実践して寸止め。一週間に一度もしていなかった場合、全員に罵倒されながらオナニーし、2回寸止めする。", 
  "罰5.自分が思う一番惨めで恥ずかしく感じやすいオナニーの仕方を告白し、その方法で1回寸止めする",
  "罰6.メンタムをクリトリスに塗り込みながら1回寸止めをする。", 
  "罰7.メンタムをおまんこに塗り込みながら1回逝く", 
  "罰8.姿見の自分にキスしながら自由にオナニーし、1回逝く。実施前にどうオナニーするのかを言う", 
  "罰9. 玩具を全て告白し、勝者が選んだ道具(複数同時可)を使用して1回逝く", 
  "罰10.皆に見せるように腰を突き出し、クリトリスを指でいじり寸止め。始める前に見てくださいとお願いをすること。",
  "罰11.勝者からのフリー命令",
  "罰12.『初心に戻って玩具無しでオナニーをするところを見ていただいています。見学者が多いほど興奮します。是非見に来てください♡残り罰回数は〇回です』とルブルの部屋で宣伝し、誰かが来るまでおまんこに人差し指と中指・クリトリスに親指を当て、膣の中で親指と中指をくっつけるように動かし続ける。", 
  "罰13.次の中から1つ選んで答える(同じ質問への回答は不可。全て答えた場合は罰数減らずスキップ)。「男性経験(おちんちん挿入本数)」「不倫経験(ある人のみ)」「同性経験(ある人のみ_人数)」「アナル経験(ある人のみ_おちんちん挿入本数)」「お勧め(お気に入り)の性玩具」", 
  "罰14.中指・薬指二本の指をクリトリスに当て、時計回りに2分以内120回転させる。", 
  "罰15.利き手とは逆の手の親指と中指で左乳首を挟みクニクニしながら、利き手の中指・薬指でクリトリスを挟み左右に3分以内180往復動かす",
  "罰16.利き手の手の平をクリトリスに当て、反時計回りに2分以内120回転させる。", 
  "罰17.人差指or中指をクリトリスに当て、PCのマウスをクリックするくらいの強さでクリトリスを1分以内60回タップする。", 
  "罰18.右乳首に思いきりデコピンを10回する。", 
  "罰19.左乳首に思いきりデコピンを10回する。", 
  "罰20.メンソレータムを乳首とクリに塗り込む。",
  "罰21.性感帯を告白し、そこを重点的に攻めたオナニーを２分間。", 
  "罰22.(自分が)されたい事/(相手に)させたい事をそれぞれ正直に告白", 
  "罰23.今まで受けた最も恥ずかしい体験を告白する。", 
  "罰24.勝者は好きな質問を一つ(ただし住所や電話番号等の質問は不可)。罰者は正直に答えなければならない。答えられないとした場合は罰回数+2。", 
  "罰25.ＨＮを勝者の指定に変える。ルブルにもその名前でログインし勝者の指定した言葉をつぶやく",
  "罰26.現在の下半身を写真に取り、携帯に１週間保管する", 
  "罰27.四つん這いになり、部屋の中にある家具のカド２箇所に、おまんこを擦りつけてマーキング（１箇所につき50回以上は擦りつけること。マーキング中は休憩不可。擦りつける家具も報告すること。２回目以降は勝者任意で振り直しも可）", 
  "罰28.勝者の指定する方法で1d5分間の全力オナニー（ルブルにて1d5のサイコロを振り「○分間全力オナニーをします」と発言し、今の心境も書き残してくること）", 
  "罰29.実況しながらイクまでオナニー　(保留可)", 
  "罰30.オナニーの頻度と一番好きなオナニーのおかず・方法を告白する。その後、告白した方法でオナニー開始　勝者の許可が出るまで続ける。"
];

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

    io.emit("userList", users);
    io.emit("system", `${socket.username} が入室しました`);

    // 入室時に罰ゲーム30個を送信
    punishItems.forEach((item, index) => {
      socket.emit("updatePunish", { index, text: item });
    });
  });

  // メッセージ
  socket.on("message", data => {
    if (typeof data === "string") data = { name: socket.username || "anon", text: data };
    const text = data.text ?? data.message ?? data;

    // 罰ゲーム判定（ランダム1個表示）
    if (text === "罰ゲーム") {
      const randomIndex = Math.floor(Math.random() * punishItems.length);
      const p = punishItems[randomIndex];
      io.emit("system", `罰ゲーム: ${p}`);
    }

    io.emit("message", { name: data.name || socket.username || "anon", text });
    console.log("受信:", { name: data.name || socket.username || "anon", text });
  });

  // 退出（表示なし）
socket.on("leave", () => {
  socket.disconnect(true);
});

// 切断（ここでだけ表示）
socket.on("disconnect", () => {
  users = users.filter(u => u.id !== socket.id);
  io.emit("userList", users);
  if (socket.username) io.emit("system", `${socket.username} が退出しました`);
});

});

// サーバー起動
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));
