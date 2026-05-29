const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { GameManager } = require('./gameManager');

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

// Serve static files from public/ (production build output)
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to get server info
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    rooms: gameManager.getRoomCount(),
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Create room
  socket.on('create_room', (data) => {
    const { playerName } = data;
    
    if (!playerName || !playerName.trim()) {
      socket.emit('error', { message: 'Player name is required' });
      return;
    }
    
    const result = gameManager.createRoom(socket.id, playerName.trim());
    
    // Join socket room
    socket.join(result.roomId);
    
    // Emit room created event
    socket.emit('room_created', {
      roomId: result.roomId,
      playerId: result.playerId,
      playerName: result.playerName,
    });
    
    console.log(`Room created: ${result.roomId}, Host: ${playerName}`);
  });

  // Join room
  socket.on('join_room', (data) => {
    const { roomId, playerName } = data;
    
    if (!roomId || !playerName || !playerName.trim()) {
      socket.emit('error', { message: 'Room ID and player name are required' });
      return;
    }
    
    const result = gameManager.joinRoom(
      roomId.toUpperCase(),
      socket.id,
      playerName.trim()
    );
    
    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }
    
    // Join socket room
    socket.join(roomId.toUpperCase());
    
    // Notify all players in the room that game has started
    io.to(roomId.toUpperCase()).emit('game_started', {
      roomId: roomId.toUpperCase(),
      board: result.room.board,
      currentPlayer: result.room.currentPlayer,
      players: result.room.players,
    });
    
    console.log(`Player joined: ${playerName} joined room ${roomId}`);
  });

  // Place stone
  socket.on('place_stone', (data) => {
    const { roomId, row, col, player } = data;
    
    const room = gameManager.getRoom(roomId);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    // Determine which player is making the move
    let currentPlayer;
    if (room.players.black && room.players.black.id === socket.id) {
      currentPlayer = 1; // Black
    } else if (room.players.white && room.players.white.id === socket.id) {
      currentPlayer = 2; // White
    } else {
      socket.emit('error', { message: 'Player not in room' });
      return;
    }
    
    // Place stone
    const result = room.placeStone(row, col, currentPlayer);
    
    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }
    
    // Broadcast stone placed event
    io.to(roomId).emit('stone_placed', {
      roomId,
      row,
      col,
      player: currentPlayer,
      board: room.board,
      nextPlayer: room.currentPlayer,
    });
    
    // Check for win
    if (result.winner !== null) {
      io.to(roomId).emit('game_over', {
        roomId,
        winner: result.winner,
        board: room.board,
      });
      
      console.log(`Game over in room ${roomId}: Winner = Player ${result.winner}`);
    }
  });

  // Restart request
  socket.on('restart_request', (data) => {
    const { roomId } = data;
    
    const room = gameManager.getRoom(roomId);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    // Reset game
    room.resetGame();
    
    // Broadcast game restarted event
    io.to(roomId).emit('game_restarted', {
      roomId,
      board: room.board,
      currentPlayer: room.currentPlayer,
    });
    
    console.log(`Game restarted in room ${roomId}`);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    
    // Find and remove player from all rooms
    for (const [roomId, room] of gameManager.rooms) {
      if (
        (room.players.black && room.players.black.id === socket.id) ||
        (room.players.white && room.players.white.id === socket.id)
      ) {
        // Get the opponent's socket id
        let opponentId = null;
        if (room.players.black && room.players.black.id === socket.id) {
          opponentId = room.players.white ? room.players.white.id : null;
        } else {
          opponentId = room.players.black ? room.players.black.id : null;
        }
        
        // Notify opponent
        if (opponentId) {
          io.to(opponentId).emit('opponent_disconnected', {
            roomId,
            message: 'Opponent disconnected',
          });
        }
        
        // Remove player
        room.removePlayer(socket.id);
        
        // If both players left, delete the room
        if (!room.players.black && !room.players.white) {
          gameManager.rooms.delete(roomId);
          console.log(`Room deleted: ${roomId}`);
        }
        
        console.log(`Player ${socket.id} removed from room ${roomId}`);
        break;
      }
    }
  });
});

// Get local IP address for LAN access
function getLocalIP() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  
  return 'localhost';
}

// Start server
const PORT = process.env.PORT || 3001; // 改用 3001 避免端口冲突
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
  console.log(`静态文件目录: ${path.join(__dirname, '../client/dist')}`);
  console.log(separator);
  console.log('等待玩家连接...');
  console.log('');
});
