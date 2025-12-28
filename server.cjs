const punishments = [
  "腕立て伏せ10回！",
  "変顔で写真を撮る！",
  "好きな食べ物を告白する！",
  "今の気分を一言で言う！",
  "次の人にジュースをおごる！",
  "好きな絵文字を3つ送る！",
  "過去の黒歴史を1つ言う！"
];

socket.on("chat", data => {
  if (data.msg === "罰ゲーム") {
    const p = punishments[Math.floor(Math.random() * punishments.length)];
    io.emit("chat", { name: "🎲 罰ゲーム", msg: p });
  } else {
    io.emit("chat", data);
  }
});
