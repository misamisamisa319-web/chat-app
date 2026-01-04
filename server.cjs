const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// public フォルダを配信
app.use(express.static('public'));

// 参加者管理
const users = new Map();

// ユーザー一覧を送信
function sendUserList() {
  const list = Array.from(users.values()).map(u => `${u.name} (${u.ip})`);
  io.emit('userList', list);
}

io.on('connection', (socket) => {
  console.log('ユーザー接続');

  socket.on('join', (data) => {
    const name = data.name;
    const ip = socket.handshake.address || '';
    const maskedIP = ip.includes('.') ? ip.split('.').slice(0, 3).join('.') + '.xxx' : ip;
    users.set(socket.id, { name, ip: maskedIP });
    console.log(`${name} が参加しました（IP: ${maskedIP}）`);
    io.emit('system', `${name} が入室しました`);
    sendUserList();
  });

  socket.on('chat', (data) => {
    io.emit('chat', {
      name: data.name,
      msg: data.msg,
      _time: Date.now()
    });
  });

  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      io.emit('system', `${user.name} が退出しました`);
      console.log(`${user.name} が退出しました（IP: ${user.ip}）`);
      users.delete(socket.id);
      sendUserList();
    }
  });
});

// ポート自動調整
let PORT = 3000;
function startServer(port) {
  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      startServer(port + 1);
    } else {
      console.error(err);
    }
  });
}

startServer(PORT);
