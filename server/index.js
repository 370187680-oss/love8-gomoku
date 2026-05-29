const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { GameManager } = require('./gameManager');
const SOCKET = require('./constants');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Initialize Game Manager
const gameManager = new GameManager();

// Serve static files from public/
app.use(express.static(path.join(__dirname, 'public')));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', rooms: gameManager.getRoomCount() });
});

// Delayed room deletion for reconnection support
const pendingDeletions = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Handle reconnection: if client provides roomId + playerName via query
  const { roomId: reconnectRoomId, playerName: reconnectPlayerName } = socket.handshake.query || {};
  if (reconnectRoomId && reconnectPlayerName) {
    const room = gameManager.getRoom(reconnectRoomId);
    if (room) {
      // Restore host identity
      if (room.players.black && room.players.black.name === reconnectPlayerName) {
        room.players.black.id = socket.id;
        socket.join(reconnectRoomId);
        console.log(`Host reconnected: ${reconnectPlayerName} -> ${socket.id} in room ${reconnectRoomId}`);
      }
      // Restore guest identity
      else if (room.players.white && room.players.white.name === reconnectPlayerName) {
        room.players.white.id = socket.id;
        socket.join(reconnectRoomId);
        console.log(`Guest reconnected: ${reconnectPlayerName} -> ${socket.id} in room ${reconnectRoomId}`);
      }
    }
  }

  // Create room
  socket.on(SOCKET.CREATE_ROOM, (data) => {
    const { playerName } = data;

    if (!playerName || !playerName.trim()) {
      socket.emit(SOCKET.ROOM_ERROR, { message: '请输入你的名字' });
      return;
    }

    const result = gameManager.createRoom(socket.id, playerName.trim());

    socket.join(result.roomId);

    socket.emit(SOCKET.ROOM_CREATED, {
      roomId: result.roomId,
      playerId: result.playerId,
      playerName: result.playerName,
    });

    console.log(`Room created: ${result.roomId}, Host: ${playerName}`);
  });

  // Join room
  socket.on(SOCKET.JOIN_ROOM, (data) => {
    const { roomId, playerName } = data;

    if (!roomId || !playerName || !playerName.trim()) {
      socket.emit(SOCKET.ROOM_ERROR, { message: '请输入房间号和你的名字' });
      return;
    }

    const result = gameManager.joinRoom(
      roomId.toUpperCase(),
      socket.id,
      playerName.trim()
    );

    if (!result.success) {
      socket.emit(SOCKET.ROOM_ERROR, { message: result.error });
      return;
    }

    socket.join(roomId.toUpperCase());

    io.to(roomId.toUpperCase()).emit(SOCKET.GAME_STARTED, {
      roomId: roomId.toUpperCase(),
      board: result.room.board,
      currentPlayer: result.room.currentPlayer,
      players: result.room.players,
    });

    console.log(`Player joined: ${playerName} joined room ${roomId}`);
  });

  // Place stone
  socket.on(SOCKET.PLACE_STONE, (data) => {
    const { roomId, row, col, playerNum } = data;

    const room = gameManager.getRoom(roomId);

    if (!room) {
      socket.emit(SOCKET.ROOM_ERROR, { message: '房间不存在' });
      return;
    }

    // Use playerNum from client (more reliable after reconnection)
    const currentPlayer = playerNum;
    if (!currentPlayer || (currentPlayer !== 1 && currentPlayer !== 2)) {
      socket.emit(SOCKET.ROOM_ERROR, { message: '无效的玩家身份' });
      return;
    }

    // Verify player is in the room (by name from query or socket match)
    const isInRoom = (room.players.black && room.players.black.id === socket.id) ||
                     (room.players.white && room.players.white.id === socket.id);
    if (!isInRoom) {
      // Try to reconnect by playerNum and update socket ID
      const queryName = socket.handshake.query?.playerName;
      if (currentPlayer === 1 && room.players.black && room.players.black.name === queryName) {
        room.players.black.id = socket.id;
      } else if (currentPlayer === 2 && room.players.white && room.players.white.name === queryName) {
        room.players.white.id = socket.id;
      } else {
        socket.emit(SOCKET.ROOM_ERROR, { message: '你不在该房间中' });
        return;
      }
    }

    const result = room.placeStone(row, col, currentPlayer);

    if (!result.success) {
      socket.emit(SOCKET.ROOM_ERROR, { message: result.error });
      return;
    }

    io.to(roomId).emit(SOCKET.STONE_PLACED, {
      roomId,
      row,
      col,
      player: currentPlayer,
      board: room.board,
      nextPlayer: room.currentPlayer,
    });

    if (result.winner !== null) {
      io.to(roomId).emit(SOCKET.GAME_OVER, {
        roomId,
        winner: result.winner,
        board: room.board,
      });
      console.log(`Game over in room ${roomId}: Winner = Player ${result.winner}`);
    }
  });

  // Restart request
  socket.on(SOCKET.RESTART_REQUEST, (data) => {
    const { roomId } = data;

    const room = gameManager.getRoom(roomId);

    if (!room) {
      socket.emit(SOCKET.ROOM_ERROR, { message: '房间不存在' });
      return;
    }

    room.resetGame();

    io.to(roomId).emit(SOCKET.GAME_RESTARTED, {
      roomId,
      board: room.board,
      currentPlayer: room.currentPlayer,
    });

    console.log(`Game restarted in room ${roomId}`);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);

    for (const [roomId, room] of gameManager.rooms) {
      const isBlack = room.players.black && room.players.black.id === socket.id;
      const isWhite = room.players.white && room.players.white.id === socket.id;

      if (isBlack || isWhite) {
        // Notify opponent
        let opponentId = null;
        if (isBlack) {
          opponentId = room.players.white ? room.players.white.id : null;
        } else {
          opponentId = room.players.black ? room.players.black.id : null;
        }

        if (opponentId) {
          io.to(opponentId).emit(SOCKET.OPPONENT_DISCONNECTED, {
            roomId,
            message: '对手断线了',
          });
        }

        // Cancel any pending deletion for this room
        if (pendingDeletions.has(roomId)) {
          clearTimeout(pendingDeletions.get(roomId));
          pendingDeletions.delete(roomId);
        }

        // Delay room deletion to allow reconnection (Render free tier disconnects frequently)
        const timeoutId = setTimeout(() => {
          const currentRoom = gameManager.getRoom(roomId);
          if (currentRoom) {
            // Check if the disconnected player has reconnected
            const blackReconnected = currentRoom.players.black && 
              io.sockets.sockets.has(currentRoom.players.black.id);
            const whiteReconnected = currentRoom.players.white && 
              io.sockets.sockets.has(currentRoom.players.white.id);

            if (!blackReconnected && !whiteReconnected) {
              gameManager.rooms.delete(roomId);
              console.log(`Room deleted after timeout: ${roomId}`);
            }
          }
          pendingDeletions.delete(roomId);
        }, 5 * 60 * 1000); // Keep room for 5 minutes

        pendingDeletions.set(roomId, timeoutId);
        console.log(`Player ${socket.id} disconnected from room ${roomId}, room kept for 5 min`);
        break;
      }
    }
  });
});

// Get local IP for LAN access
function getLocalIP() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Start server
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  const localIP = getLocalIP();
  const separator = '='.repeat(60);
  console.log(separator);
  console.log('Love8 情侣五子棋服务器启动成功！');
  console.log(separator);
  console.log('服务器运行在:');
  console.log(`  - 本地: http://localhost:${PORT}`);
  console.log(`  - 局域网: http://${localIP}:${PORT}`);
  console.log('Socket.io 已启用');
  console.log(`静态文件目录: ${path.join(__dirname, 'public')}`);
  console.log(separator);
  console.log('等待玩家连接...');
  console.log('');
});
