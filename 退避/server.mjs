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
    private: msg.private || false
  };
}



/* ===== 管理者ログ ===== */
app.get("/admin", (req, res) => {
function addDate(timeStr) {
  if (!timeStr) return "";

  const d = new Date(
    new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
  );

  const M = String(d.getMonth() + 1).padStart(2, "0");
  const D = String(d.getDate()).padStart(2, "0");

  return `${M}/${D} ${timeStr}`;
}


  if (req.query.key !== process.env.ADMIN_KEY) {
    return res.status(403).send("Forbidden");
  }

  const userRows = users.map(u => `
    <tr>
      <td>${u.name}</td>
      <td>${u.room}</td>
      <td>
        <form method="POST" action="/admin/kick">
          <input type="hidden" name="key" value="${process.env.ADMIN_KEY}">
          <input type="hidden" name="userId" value="${u.id}">
          <button type="submit">キック</button>
        </form>
      </td>
    </tr>
  `).join("");

  const logRows = [...messagesLog].reverse().map(m => `
    <tr>
      <td>${addDate(m.time)}</td>
      <td>${m.room}</td>
      <td>${m.name}</td>
      <td>${m.private ? "内緒" : "通常"}</td>
      <td>${m.text}</td>
    </tr>
  `).join("");

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
        <tr><th>名前</th><th>部屋</th><th>操作</th></tr>
        ${userRows}
      </table>

      <h3>ログ</h3>
      <table>
        <tr><th>時刻</th><th>部屋</th><th>名前</th><th>種別</th><th>内容</th></tr>
        ${logRows}
      </table>
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
"女子罰6.舌・両乳首に洗濯ばさみをつけて罰を続ける、無理な場合その箇所分×２回罰追加",
"女子罰7.お尻の穴に綿棒・ペン・アナルプラグなどを1本入れる。入れたものを報告すること。",
"女子罰8.メンソレータムを乳首とクリとオマンコに塗り込む、ない場合はフリー命令",
"女子罰9.勝者は好きな質問を3つ(ただし住所や電話番号等の質問は不可)。罰者は正直に答えなければならない。答えられないとした場合は罰回数+2。",
"女子罰10.勝者からのフリー命令",
"女子罰11.勝利者の指定する方法でオナニーをして寸止めする。",
"女子罰12.入室者の数だけ寸止めオナニーをする。",
"女子罰13.玩具を全て告白し、勝者が選んだ道具(複数同時可)を使用して一回寸止めオナニーする。玩具がない場合は寸止め3回連続する。",
"女子罰14.ルブルの部屋上げをして「今から寸止めオナニーします。見に来てください」とつぶやき、一回寸止めオナニーする。",
"女子罰15.自分が思う一番惨めで恥ずかしく感じやすいオナニーの仕方を告白し、その方法で一回寸止めする。",
"女子罰16.オナニーの頻度と一番好きなオナニーのおかず・方法を告白する。その後、告白した方法で一回寸止めする。",
"女子罰17.性感帯を告白し、そこを重点的に攻めたオナニーで一回寸止めする。",
"女子罰18.四つん這いになって部屋を1周歩く、その際部屋の紹介をする。",
"女子罰19.(自分が)されたい事/(相手に)させたい事をそれぞれ正直に告白。",
"女子罰20.今まで受けた最も恥ずかしい体験を告白する。",
"女子罰21.現在の下半身を写真に取り、携帯に1週間保管する",
"女子罰22.勝利者から好きな箇所に落書きを1つして写真を撮りロック画面に3日する。",
"女子罰23.勝利者から好きな箇所に落書きを1つしてラインorカカオの異性に1人に「今の姿を説明しどう思う？」と送る。出来ない場合は勝利者がフリー命令。",
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
"男子罰16.自分が思う一番惨めで恥ずかしく感じやすいオナニーの仕方を告白し、その方法で一回寸止めする。",
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
"絶頂許可1.一番好きなオナニーの方法を告白し、その方法で絶頂する。",
"絶頂許可2.性感帯をすべて告白して。そこを中心にオナニーして絶頂する。",
"絶頂許可3.エッチな想像でされてみたいことを告白して。それを想像しながらオナニーして絶頂する。",
"絶頂許可4.これまで寸止めした回数絶頂するまで手を止めてはいけない。",
"絶頂許可5.これまで中出しされた人の人数を告白。その人数分連続絶頂する。",
"絶頂許可6.参加者の人数分連続絶頂する。",
];

//命令女
const onaGirlPunishItems = [
"命令女1.乳首に触れないように乳輪を指でくるくるなぞる２分間。",
"命令女2.乳頭を薬指でふれるかふれないかの位置で上下にスリスリする2分間。",
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
"命令女13.オマンコの中に指を入れズボズボ出し入れを３分間する。",
"命令女14.オマンコに玩具または棒状の物をズボズボ出し入れ3分間する。",
"命令女15.「私はドMの変態ですとつぶやきながら」頭の上で手を組んでガニ股で立った状態で腰へコ30回。",
"命令女16.ガニ股で立ちクリに当たるか当たらないかの位置に人差し指と中指を動かさないように置いて、それに腰ヘコしながらクリを刺激する3分間",
"命令女17.舌を出しながら四つん這いになって部屋を1周歩く、その際部屋の紹介をする。",
"命令女18.ルブルの部屋上げをして、「見学者様あなたの指示した通りに寸止めオナニーします」とつぶやき5分間オナニーする。5分以内に見学者が来た場合、来た見学者の人数指示をしてもらい寸止めする。",
"命令女19.玩具を持ってる場合は玩具で寸止め1回する。もってない場合は回数+2回。",
"命令女20.回数を+2回してルブルにて1d5+3のサイコロを振り「○分間全力オナニーをします」と発言し、今の心境も書き残してくること。",
"命令女21.回数を+2回して「ドMの変態です。見学者が多いほど興奮します。是非見に来てください♡残り罰回数は〇回です」とルブルの部屋で宣伝し、誰かが来るまでクリをスリスリしつづける。",
"命令女22.回数を+2回してルブルの部屋に玩具を全て告白して玩具で見学者がくるまでオナニーする。「例：私の持ってる玩具はローター1、バイブ1です」",
"命令女23.ガニ股で立ったまま1回寸止めオナニーする。",
"命令女24.直近一週間のオナニー回数を告白。その中の一つの方法で1回寸止めする。",
"命令女25.性感帯を告白し、そこを重点的に攻めたオナニーで1回寸止めする。",
"命令女26.オナニーの頻度と一番好きなオナニーのおかず・方法を告白する。その後、告白した方法でオナニーをして1回寸止めする。",
"命令女27.自分が思う一番惨めで恥ずかしく感じやすいオナニーの仕方を告白し、その方法で1回寸止めする。",
"命令女28.今まで経験した人数を告白してその回数寸止めする。",
"命令女29.今現在入室してる人の数寸止めする。",
"命令女30.今までやってきた回数寸止めする。"
];
//命令男
const onaBoyPunishItems = [
"命令男1.乳首に触れないように乳輪を指でくるくるなぞる２分間。",
"命令男2.乳頭を薬指でふれるかふれないかの位置で上下にスリスリする2分間。",
"命令男3.乳首をコリコリする3分間。",
"命令男4.乳首を親指と中指でコリコリ潰しながら人差し指でスリスリ3分間する。",
"命令男5.乳首を親指と中指でコリコリ潰しながら人差し指の爪でカリカリ3分間する。",
"命令男6.乳首にメンソレータムをぬって3分間塗り込む、もしない場合は我慢汁を塗る。",
"命令男7.亀頭にメンソレータムを塗って3分間塗り込む、ない場合は歯磨き粉を薄く塗る。",
"命令男8.１秒間に１回のペースでしこしこ３分する。",
"命令男9.人差し指と中指を折り曲げてカリ首にひっかけるように亀頭だけ３分間しこしこする。",
"命令男10.亀頭を手のひらで撫でるようにスリスリ３分間する。",
"命令男11.竿部分だけをしこしこ３分間する。",
"命令男12.利き手じゃない方でしこしこ３分間する。",
"命令男13.我慢汁をおちんぽ全体に塗り込む。出てない場合は唾液をおちんぽ全体に塗り込む",
"命令男14.亀頭の裏筋を３分間すりすりする。",
"命令男15.足をピンと張って腰を限界まで突き出してしこしこ３分間。",
"命令男16.舌を出しながら四つん這いになって部屋を1周歩く、その際部屋の紹介をする。",
"命令男17.ルブルの部屋上げをして、「見学者様が来なければ破滅してしまいます。どうか助けてください」とつぶやきしこしこし、寸止め状態を維持し見学者に１分計ってもらう。",
"命令男18.ルブルの部屋上げをして、「見学者様あなたの指示した通りに寸止めオナニーします」とつぶやき5分間オナニーする。5分以内に見学者が来た場合、来た見学者の人数指示をしてもらい寸止めする。",
"命令男19.玩具を持ってる場合は玩具で寸止め1回する。もってない場合は回数+2回。",
"命令男20.回数を+2回してルブルにて1d5+3のサイコロを振り「○分間全力オナニーをします」と発言し、今の心境も書き残してくること。",
"命令男21.回数を+2回して「ドMの変態です。見学者が多いほど興奮します。是非見に来てください♡残り罰回数は〇回です」とルブルの部屋で宣伝し、誰かが来るまで亀頭をスリスリしつづける。最大５分間",
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
"苦痛罰6.歯磨き粉をつけた歯ブラシでクリを磨く。",
"苦痛罰7.歯磨き粉をつけた歯ブラシでオマンコを磨く。",
"苦痛罰8.オマンコを全力で10回叩く。",
"苦痛罰9.右のお尻を全力で10回叩く。",
"苦痛罰10.スリッパで右のお尻を全力で10回叩く。",
"苦痛罰11.お尻にバイブかローターを入れて強にしたまま四つん這いになり舌を出したままお家を1周する。",
"苦痛罰12.乳首を壁につけた状態で部屋を1周周る。",
"苦痛罰13.オマンコにバイブかディルドを入れて抜けないようにパンツを履き全力で押し込むように10回叩く。",
"苦痛罰14.オマンコにバイブかディルドを入れて抜けないようにパンツを履き膝立ちになり、そこから勢いよく座り奥までバイブを押し込むを10回する。",
"苦痛罰15.【持続】乳首に洗濯バサミをつけたまま罰を行う。",
"苦痛罰16.【持続】玩具またはペンなどをオマンコとお尻にいれたまま罰を行う。",
"苦痛罰17.【持続】割る前の割り箸の間に乳首か舌を挟み空いてる側を輪ゴムで締めた状態で罰を行う。",
"苦痛罰18.【持続】これ以降空いてる時間は常にクリを刺激しながら罰を行う。",
"苦痛罰19.乳首とクリに刺激物を塗る。",
"苦痛罰20.おまんこに刺激物を塗る",
];

function shuffle(a){ return a.sort(()=>Math.random()-0.5); }
let punishStockByRoom = {};

function initPunishRoom(room){
  if (!punishStockByRoom[room]) {
    punishStockByRoom[room] = {
      girl: shuffle([...punishItems]),
      boy: shuffle([...boyPunishItems]),
      hitori: shuffle([...hitoriPunishItems]),
      onaGirl: shuffle([...onaGirlPunishItems]),
      onaBoy: shuffle([...onaBoyPunishItems]),
      pain: shuffle([...specialPainPunishItems]),
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
    rematchVotes: {},
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
  rematchVotes: {},   // ← 追加②：再戦押した人
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

  // ===== 再戦ボタン =====
socket.on("denkiRematch", () => {

  if (!["denki","denki1","denki2"].includes(socket.room)) return;

  const game = denkiRooms[socket.room];

  if (!game.ended) return;

  const player = game.players.find(p => p.id === socket.id);
  if (!player) return;

  game.rematchVotes[socket.id] = true;

  if (Object.keys(game.rematchVotes).length === 2) {

    game.ended = false;
    game.rematchVotes = {};

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

    const msg = {
      name: "system",
      text: "🔁 再戦開始！",
      room: socket.room,
      time: getTimeString()
    };

    messagesLog.push(normalizeLog(msg));
    saveLogs();
    io.to(socket.room).emit("message", msg);
  }

  io.to(socket.room).emit("denkiState", denkiStateRoom(socket.room));
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

  socket.on("join", ({ name, color="black", room="room1" }) => {
    socket.username = name;
    socket.room = room;
    socket.join(room);

  const existingUser = users.find(u => u.name === name && u.room === room);

if (existingUser) {
  // 再接続
  existingUser.id = socket.id;
  existingUser.lastActive = Date.now();
} else {
  // 新規
  users.push({
    id: socket.id,
    name,
    color,
    room,
    lastActive: Date.now()
  });
}



    io.to(room).emit("userList", users.filter(u=>u.room===room));
    socket.emit(
  "pastMessages",
  messagesLog.filter(m =>
    m.room === room &&
    (!m.private || m.to === socket.id || m.from === socket.id)
  )
);

    io.emit("lobbyUpdate", getLobbyInfo());

  /* ===== 電気椅子参加 ===== */
if (["denki","denki1","denki2"].includes(room)) {

  const game = denkiRooms[room];

  // ★ 名前で既存プレイヤーを探す（再接続対策）
  const existing = game.players.find(p => p.name === name);

  if (existing) {
    existing.id = socket.id;
  } 
  else if (game.players.length < 2) {
    game.players.push({
      id: socket.id,
      name,
      score: 0,
      shock: 0,
      turns: []
    });
  }

  io.to(room).emit("denkiState", denkiStateRoom(room));
}




 
/// ★★ 2人目の対戦者が入った瞬間だけ勝負開始 ★★
if (["denki","denki1","denki2"].includes(room)) {

  const game = denkiRooms[room];

  if (game.players.length === 2 && !game.started) {

    game.started = true;

    const startMsg = {
      name: "system",
      text: `⚡ 勝負開始！ ${game.players[0].name} vs ${game.players[1].name}`,
      room: room,
      time: getTimeString()
    };

    messagesLog.push(normalizeLog(startMsg));
    saveLogs();
    io.to(room).emit("message", startMsg);
  }
  }

}); 


 socket.on("denkiSet", seat => {

  if (!["denki","denki1","denki2"].includes(socket.room)) return;

  const game = denkiRooms[socket.room];

  if (game.phase !== "set") return;

  const me = game.players[game.turn];
  if (!me || me.id !== socket.id) return;

  game.trapSeat = seat;
  game.phase = "sit";

  io.to(socket.room).emit(
    "denkiState",
    denkiStateRoom(socket.room)
  );
});

socket.on("denkiSit", seat => {

  if (!["denki","denki1","denki2"].includes(socket.room)) return;

  const game = denkiRooms[socket.room];

  if (game.phase !== "sit") return;

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

messagesLog.push(normalizeLog(msg));
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

  messagesLog.push(normalizeLog(resultMsg));
  saveLogs();
  io.to(socket.room).emit("message", resultMsg);

  game.ended = true;
  game.phase = "end";
  setTimeout(() => {
  game.players = [];
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

  messagesLog.push(normalizeLog(resultMsg));
  saveLogs();
  io.to(socket.room).emit("message", resultMsg);

  game.ended = true;
  game.phase = "end";
  setTimeout(() => {
  game.players = [];
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
      messagesLog.push(normalizeLog(msg));

      saveLogs();
      io.to(socket.room).emit("message",msg);
      return;
    }
if(text==="女子罰"){
  const msg={
    name: socket.username,
    text: getGirlPunish(socket.room),
    color: "red",
    bold: true,
    room: socket.room,
    time: getTimeString()
  };
  messagesLog.push(normalizeLog(msg));
  saveLogs();
  io.to(socket.room).emit("message", msg);
  return;
}

if(text==="男子罰"){
  const msg={
    name: socket.username,
    text: getBoyPunish(socket.room),
    color: "blue",
    bold: true,
    room: socket.room,
    time: getTimeString()
  };
  messagesLog.push(normalizeLog(msg));
  saveLogs();
  io.to(socket.room).emit("message", msg);
  return;
}

if(text==="命令女"){
  const msg={
    name: socket.username,
    text: getOnaGirlPunish(socket.room),
    color: "deeppink",
    bold: true,
    room: socket.room,
    time: getTimeString()
  };
  messagesLog.push(normalizeLog(msg));
  saveLogs();
  io.to(socket.room).emit("message", msg);
  return;
}

if(text==="命令男"){
  const msg={
    name: socket.username,
    text: getOnaBoyPunish(socket.room),
    color: "navy",
    bold: true,
    room: socket.room,
    time: getTimeString()
  };
  messagesLog.push(normalizeLog(msg));
  saveLogs();
  io.to(socket.room).emit("message", msg);
  return;
}

if(text==="苦痛罰"){
  const msg={
    name: socket.username,
    text: getPainPunish(socket.room),
    color: "purple",
    bold: true,
    room: socket.room,
    time: getTimeString()
  };
  messagesLog.push(normalizeLog(msg));
  saveLogs();
  io.to(socket.room).emit("message", msg);
  return;
}

if (text === "絶頂許可") {
  const msg = {
    name: socket.username,
    text: getHitoriPunish(socket.room),
    color: "gray",
    bold: true,
    room: socket.room,
    time: getTimeString()
  };
  messagesLog.push(normalizeLog(msg));
  saveLogs();
  io.to(socket.room).emit("message", msg);
  return;
}



 
    
if (data.to) {
  const targetUser = users.find(u => u.id === data.to);

  const msg = {
    name: socket.username,
    text,
    room: socket.room,
    time: getTimeString(),
    private: true,
    to: data.to,
    toName: targetUser?.name || "不明"
  };

  messagesLog.push(normalizeLog(msg));

  saveLogs();
  socket.emit("message", msg);
  io.to(data.to).emit("message", msg);
  return;
}


const u = users.find(x => x.id === socket.id);

    const msg = {
  name: socket.username,
  text,
  color: data.color || u?.color,
  room: socket.room,
  time: getTimeString()
};
messagesLog.push(normalizeLog(msg));

        saveLogs();
    io.to(socket.room).emit("message",msg);
  });

   socket.on("leave",()=>socket.disconnect(true));
  socket.on("disconnect",()=>{
    const leftRoom = socket.room;

    users = users.filter(u => u.id !== socket.id);

   setTimeout(() => {
  if (leftRoom && !io.sockets.adapter.rooms.get(leftRoom)) {
    messagesLog = messagesLog.filter(m => m.room !== leftRoom);
    saveLogs();
    delete punishStockByRoom[leftRoom];

    if (["denki","denki1","denki2"].includes(leftRoom)) {
      denkiRooms[leftRoom] = createDenki();
    }
  }

  io.emit("lobbyUpdate", getLobbyInfo());
}, 0);

  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
