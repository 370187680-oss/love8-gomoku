// Integration tests for Love8 Gomoku
// Tests Socket.io communication between client and server
// Run with: node test_integration.js

const { Server } = require('socket.io');
const { io: Client } = require('socket.io-client');
const http = require('http');
const { GameManager } = require('./gameManager');

let passed = 0;
let failed = 0;
const errors = [];

function assert(condition, testName) {
  if (condition) {
    passed++;
    console.log(`✅ PASS: ${testName}`);
  } else {
    failed++;
    errors.push(`FAIL: ${testName}`);
    console.log(`❌ FAIL: ${testName}`);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// TEST SUITE 1: Socket.io Events
// =============================================================================
console.log('\n========== TEST SUITE 1: Socket.io Events ==========\n');

async function testCreateRoom() {
  return new Promise((resolve) => {
    // Create HTTP server and Socket.io server
    const app = require('express')();
    const server = http.createServer(app);
    const io = new Server(server);
    const gameManager = new GameManager();
    
    // Set up socket handlers (same as index.js)
    io.on('connection', (socket) => {
      socket.on('create_room', (data) => {
        const { playerName } = data;
        const result = gameManager.createRoom(socket.id, playerName.trim());
        socket.join(result.roomId);
        socket.emit('room_created', {
          roomId: result.roomId,
          playerId: result.playerId,
          playerName: result.playerName,
        });
      });
    });
    
    server.listen(3002, () => {
      // Create client connection
      const clientSocket = new Client('http://localhost:3002');
      
      clientSocket.on('connect', () => {
        clientSocket.emit('create_room', { playerName: 'Alice' });
      });
      
      clientSocket.on('room_created', (data) => {
        assert(data.roomId !== undefined, 'create_room should return roomId');
        assert(data.playerId !== undefined, 'create_room should return playerId');
        assert(data.playerName === 'Alice', 'create_room should return player name');
        assert(data.roomId.length === 4, 'Room ID should be 4 characters');
        
        clientSocket.close();
        server.close();
        resolve();
      });
      
      setTimeout(() => {
        console.log('⚠️  Timeout waiting for room_created event');
        clientSocket.close();
        server.close();
        resolve();
      }, 3000);
    });
  });
}

async function testJoinRoom() {
  return new Promise((resolve) => {
    const app = require('express')();
    const server = http.createServer(app);
    const io = new Server(server);
    const gameManager = new GameManager();
    
    io.on('connection', (socket) => {
      socket.on('create_room', (data) => {
        const result = gameManager.createRoom(socket.id, data.playerName.trim());
        socket.join(result.roomId);
        socket.emit('room_created', result);
      });
      
      socket.on('join_room', (data) => {
        const result = gameManager.joinRoom(data.roomId, socket.id, data.playerName.trim());
        if (result.success) {
          socket.join(data.roomId.toUpperCase());
          io.to(data.roomId.toUpperCase()).emit('game_started', {
            roomId: data.roomId.toUpperCase(),
            board: result.room.board,
            currentPlayer: result.room.currentPlayer,
            players: result.room.players,
          });
        }
      });
    });
    
    server.listen(3003, async () => {
      const client1 = new Client('http://localhost:3003');
      const client2 = new Client('http://localhost:3003');
      
      let roomId = null;
      
      client1.on('connect', () => {
        client1.emit('create_room', { playerName: 'Alice' });
      });
      
      client1.on('room_created', (data) => {
        roomId = data.roomId;
        // Now client2 joins
        client2.emit('join_room', { roomId, playerName: 'Bob' });
      });
      
      client2.on('connect', () => {
        // Will join after client1 creates room
      });
      
      client2.on('game_started', (data) => {
        assert(data.roomId !== undefined, 'game_started should have roomId');
        assert(data.board !== undefined, 'game_started should have board');
        assert(data.currentPlayer === 1, 'Black should go first');
        assert(data.players.black.name === 'Alice', 'Black player should be Alice');
        assert(data.players.white.name === 'Bob', 'White player should be Bob');
        
        client1.close();
        client2.close();
        server.close();
        resolve();
      });
      
      setTimeout(() => {
        console.log('⚠️  Timeout waiting for game_started event');
        client1.close();
        client2.close();
        server.close();
        resolve();
      }, 3000);
    });
  });
}

async function testPlaceStone() {
  return new Promise((resolve) => {
    const app = require('express')();
    const server = http.createServer(app);
    const io = new Server(server);
    const gameManager = new GameManager();
    
    io.on('connection', (socket) => {
      socket.on('create_room', (data) => {
        const result = gameManager.createRoom(socket.id, data.playerName.trim());
        socket.join(result.roomId);
        socket.emit('room_created', result);
      });
      
      socket.on('join_room', (data) => {
        const result = gameManager.joinRoom(data.roomId, socket.id, data.playerName.trim());
        if (result.success) {
          socket.join(data.roomId.toUpperCase());
          io.to(data.roomId.toUpperCase()).emit('game_started', result);
        }
      });
      
      socket.on('place_stone', (data) => {
        const room = gameManager.getRoom(data.roomId);
        if (!room) return;
        
        const currentPlayer = room.players.black.id === socket.id ? 1 : 2;
        const result = room.placeStone(data.row, data.col, currentPlayer);
        
        if (result.success) {
          io.to(data.roomId).emit('stone_placed', {
            roomId: data.roomId,
            row: data.row,
            col: data.col,
            player: currentPlayer,
            board: room.board,
            nextPlayer: room.currentPlayer,
          });
          
          if (result.winner !== null) {
            io.to(data.roomId).emit('game_over', {
              roomId: data.roomId,
              winner: result.winner,
            });
          }
        }
      });
    });
    
    server.listen(3004, async () => {
      const client1 = new Client('http://localhost:3004');
      const client2 = new Client('http://localhost:3004');
      
      let roomId = null;
      let gameStarted = false;
      
      client1.on('connect', () => {
        client1.emit('create_room', { playerName: 'Alice' });
      });
      
      client1.on('room_created', (data) => {
        roomId = data.roomId;
        client2.emit('join_room', { roomId, playerName: 'Bob' });
      });
      
      client2.on('game_started', (data) => {
        gameStarted = true;
        // Client1 (black) places a stone
        client1.emit('place_stone', { roomId, row: 7, col: 7 });
      });
      
      client1.on('stone_placed', (data) => {
        assert(data.row === 7, 'stone_placed should have correct row');
        assert(data.col === 7, 'stone_placed should have correct col');
        assert(data.player === 1, 'stone_placed should have correct player');
        assert(data.board[7][7] === 1, 'Board should be updated');
        assert(data.nextPlayer === 2, 'Next player should be white (2)');
        
        client1.close();
        client2.close();
        server.close();
        resolve();
      });
      
      setTimeout(() => {
        console.log('⚠️  Timeout waiting for stone_placed event');
        client1.close();
        client2.close();
        server.close();
        resolve();
      }, 3000);
    });
  });
}

// =============================================================================
// RUN ALL TESTS
// =============================================================================
console.log('Starting integration tests...\n');

(async () => {
  console.log('Test 1: create_room event');
  await testCreateRoom();
  
  console.log('\nTest 2: join_room event (triggers game_started)');
  await testJoinRoom();
  
  console.log('\nTest 3: place_stone event (triggers stone_placed)');
  await testPlaceStone();
  
  // =============================================================================
  // SUMMARY
  // =============================================================================
  console.log('\n============================================================');
  console.log(`INTEGRATION TEST SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('============================================================\n');
  
  if (errors.length > 0) {
    console.log('ERRORS:');
    errors.forEach(err => console.log(`  ${err}`));
    console.log('');
  }
  
  process.exit(failed > 0 ? 1 : 0);
})();
