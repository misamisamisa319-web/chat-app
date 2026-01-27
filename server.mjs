import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let users = [];
let messagesLog = [];

app.use(express.static("public"));


// ===== 管理者用ログ確認（ミサ専用）=====
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
        tr:nth-child(even){ background:#fafafa; }
      </style>
    </head>
    <body>
      <h2>管理者ログ（全ルーム・内緒含む）</h2>
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
// 女子罰30個
const punishItems = [
"女子罰1.勝者の指定する方法で1d5+3分間の全力オナニー（ルブルにて1d5のサイコロを振り「○分間全力オナニーをします」と発言し、今の心境も書き残してくること）",
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
// ===== special用 罰 =====
const specialGirlPunishItems = [
"女子罰1.勝者の指定する方法で1d5+3分間の全力オナニー（ルブルにて1d5のサイコロを振り「○分間全力オナニーをします」と発言し、今の心境も書き残してくること）",
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
"女子罰30.【地獄】勝利者の奴隷に3日なる。",
];

const specialBoyPunishItems = [
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
"苦痛罰12.乳首を壁につけて状態で部屋を1周周る。",
"苦痛罰13.オマンコにバイブかディルドを入れて抜けないようにパンツを履き全力で押し込むように10回叩く。",
"苦痛罰14.オマンコにバイブかディルドを入れて抜けないようにパンツを履き膝立ちになり、そこから勢いよく座り奥までバイブを押し込むを10回する。",
"苦痛罰15.【持続】乳首に洗濯バサミをつけたまま罰を行う。",
"苦痛罰16.【持続】玩具またはペンなどをオマンコとお尻にいれたまま罰を行う。",
"苦痛罰17.【持続】割る前の割り箸の間に乳首か舌を挟み空いてる側を輪ゴムで締めた状態で罰を行う。",
"苦痛罰18.【持続】これ以降空いてる時間は常にクリを刺激しながら罰うぃ行う。",
"苦痛罰19.乳首とクリに刺激物を塗る。",
"苦痛罰20.おまんこに刺激物を塗る",
];



function shuffle(a){ return a.sort(()=>Math.random()-0.5); }

/* ===== 部屋別 罰ストック ===== */
let punishStockByRoom = {};

function initPunishRoom(room){
  if (!punishStockByRoom[room]) {

    const isSpecial = room === "special";

    punishStockByRoom[room] = {
  girl: shuffle([...(isSpecial ? specialGirlPunishItems : punishItems)]),
  boy:  shuffle([...(isSpecial ? specialBoyPunishItems  : boyPunishItems)]),
  pain: isSpecial ? shuffle([...specialPainPunishItems]) : []
};

  }
}


function getGirlPunish(room){
  initPunishRoom(room);

  if (!punishStockByRoom[room].girl.length) {
    const isSpecial = room === "special";
    punishStockByRoom[room].girl = shuffle([
      ...(isSpecial ? specialGirlPunishItems : punishItems)
    ]);
  }

  return punishStockByRoom[room].girl.shift();
}

function getBoyPunish(room){
  initPunishRoom(room);

  if (!punishStockByRoom[room].boy.length) {
    const isSpecial = room === "special";
    punishStockByRoom[room].boy = shuffle([
      ...(isSpecial ? specialBoyPunishItems : boyPunishItems)
    ]);
  }

  return punishStockByRoom[room].boy.shift();
}
function getPainPunish(room){
  initPunishRoom(room);

  if (!punishStockByRoom[room].pain.length) {
    punishStockByRoom[room].pain = shuffle([...specialPainPunishItems]);
  }

  return punishStockByRoom[room].pain.shift();
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
}, 60000);

/* ===== 接続 ===== */
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
  });

  socket.on("updateColor", ({ color })=>{
    updateActive(socket);
    const u = users.find(u=>u.id===socket.id);
    if(u){
      u.color = color;
      io.to(socket.room).emit("userList", users.filter(x=>x.room===socket.room));
    }
  });

  socket.on("message", data=>{
    updateActive(socket);
    const text = (data.text ?? "").trim();
    if(!text) return;

    if(text==="女子罰"){
      const msg = {
        name:socket.username,
        text:`女子罰 → ${getGirlPunish(socket.room)}`,
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
        text:`男子罰 → ${getBoyPunish(socket.room)}`,
        color:"blue",
        room:socket.room,
        time:getTimeString()
      };
      messagesLog.push(msg);
      io.to(socket.room).emit("message", msg);
      return;
    }

    if (text === "苦痛罰" && socket.room === "special") {
  const msg = {
    name: socket.username,
    text: `苦痛罰 → ${getPainPunish(socket.room)}`,
    color: "purple",
    room: socket.room,
    time: getTimeString()
  };
  messagesLog.push(msg);
  io.to(socket.room).emit("message", msg);
  return;
}

  // ===== 内緒メッセージ =====
  if (data.to) {
    const msg = {
      name: socket.username,
      text,
      color: data.color || "black",
      room: socket.room,
      time: getTimeString(),
      private: true,
      to: data.to
    };

    messagesLog.push(msg);

    socket.emit("message", msg);         // 自分に表示
    io.to(data.to).emit("message", msg); // 相手にだけ送信
    return;
  }

    const msg = {
      name:socket.username,
      text,
      color:data.color || "black",
      room:socket.room,
      time:getTimeString()
    };
    messagesLog.push(msg);
    io.to(socket.room).emit("message", msg);
  });

  socket.on("leave", ()=> socket.disconnect(true));

  socket.on("disconnect", ()=>{
    users = users.filter(u=>u.id!==socket.id);
    io.to(socket.room).emit("userList", users.filter(u=>u.room===socket.room));
    io.emit("lobbyUpdate", getLobbyInfo());
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=>console.log(`Server running on ${PORT}`));
