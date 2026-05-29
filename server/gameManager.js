const { v4: uuidv4 } = require('uuid');

/**
 * Room class representing a game room
 */
class Room {
  constructor(id, hostId, hostName) {
    this.id = id;
    this.hostId = hostId;
    this.hostName = hostName;
    
    // Players: { black: { id, name }, white: { id, name } }
    this.players = {
      black: { id: hostId, name: hostName },
      white: null,
    };
    
    // Board: 15x15 array, 0=empty, 1=black, 2=white
    this.board = Array.from({ length: 15 }, () =>
      Array.from({ length: 15 }, () => 0)
    );
    
    this.currentPlayer = 1; // 1=black, 2=white; black goes first
    this.gameStarted = false;
    this.gameEnded = false;
    this.winner = null;
    this.lastMove = null;
    
    // Socket room for broadcasting
    this.socketRoom = id;
  }

  /**
   * Add a player to the room (as white)
   * @param {string} playerId - Player socket ID
   * @param {string} playerName - Player name
   * @returns {boolean} - True if successful
   */
  addPlayer(playerId, playerName) {
    if (this.players.white !== null) {
      return false; // Room is full
    }
    
    this.players.white = { id: playerId, name: playerName };
    this.gameStarted = true;
    return true;
  }

  /**
   * Remove a player from the room
   * @param {string} playerId - Player socket ID
   * @returns {string|null} - ID of the opponent who was disconnected, or null
   */
  removePlayer(playerId) {
    let disconnectedPlayer = null;
    
    if (this.players.black && this.players.black.id === playerId) {
      disconnectedPlayer = this.players.black;
      this.players.black = null;
    }
    if (this.players.white && this.players.white.id === playerId) {
      disconnectedPlayer = this.players.white;
      this.players.white = null;
    }
    
    return disconnectedPlayer;
  }

  /**
   * Check if a player has won after placing a stone
   * @param {number} row - Row index
   * @param {number} col - Column index
   * @param {number} player - Player number (1 or 2)
   * @returns {boolean} - True if the player has won
   */
  checkWin(row, col, player) {
    // Four directions: [rowDelta, colDelta]
    const directions = [
      [0, 1],  // horizontal
      [1, 0],  // vertical
      [1, 1],  // diagonal right
      [1, -1], // diagonal left
    ];

    for (const [rowDelta, colDelta] of directions) {
      let count = 1; // Count the current stone

      // Check positive direction
      let r = row + rowDelta;
      let c = col + colDelta;
      while (
        r >= 0 && r < 15 &&
        c >= 0 && c < 15 &&
        this.board[r][c] === player
      ) {
        count++;
        r += rowDelta;
        c += colDelta;
      }

      // Check negative direction
      r = row - rowDelta;
      c = col - colDelta;
      while (
        r >= 0 && r < 15 &&
        c >= 0 && c < 15 &&
        this.board[r][c] === player
      ) {
        count++;
        r -= rowDelta;
        c -= colDelta;
      }

      // Five in a row means win
      if (count >= 5) {
        return true;
      }
    }

    return false;
  }

  /**
   * Place a stone on the board
   * @param {number} row - Row index
   * @param {number} col - Column index
   * @param {number} player - Player number (1 or 2)
   * @returns {Object} - { success: boolean, winner: number|null }
   */
  placeStone(row, col, player) {
    // Validate move
    if (row < 0 || row >= 15 || col < 0 || col >= 15) {
      return { success: false, error: 'Invalid position' };
    }
    
    if (this.board[row][col] !== 0) {
      return { success: false, error: 'Cell already occupied' };
    }
    
    if (player !== this.currentPlayer) {
      return { success: false, error: 'Not your turn' };
    }
    
    if (this.gameEnded) {
      return { success: false, error: 'Game has ended' };
    }

    // Place stone
    this.board[row][col] = player;
    this.lastMove = { row, col, player };

    // Check win
    if (this.checkWin(row, col, player)) {
      this.gameEnded = true;
      this.winner = player;
      return { success: true, winner: player };
    }

    // Check draw
    let isDraw = true;
    for (let i = 0; i < 15; i++) {
      for (let j = 0; j < 15; j++) {
        if (this.board[i][j] === 0) {
          isDraw = false;
          break;
        }
      }
      if (!isDraw) break;
    }

    if (isDraw) {
      this.gameEnded = true;
      this.winner = 0; // Draw
      return { success: true, winner: 0 };
    }

    // Switch player
    this.currentPlayer = player === 1 ? 2 : 1;
    return { success: true, winner: null };
  }

  /**
   * Reset the game for a new round
   */
  resetGame() {
    this.board = Array.from({ length: 15 }, () =>
      Array.from({ length: 15 }, () => 0)
    );
    this.currentPlayer = 1;
    this.gameStarted = true;
    this.gameEnded = false;
    this.winner = null;
    this.lastMove = null;
  }

  /**
   * Serialize room state for JSON response
   * @returns {Object} - Serializable room data
   */
  toJSON() {
    return {
      id: this.id,
      players: this.players,
      board: this.board,
      currentPlayer: this.currentPlayer,
      gameStarted: this.gameStarted,
      gameEnded: this.gameEnded,
      winner: this.winner,
      lastMove: this.lastMove,
    };
  }
}

/**
 * GameManager class for managing multiple rooms
 */
class GameManager {
  constructor() {
    this.rooms = new Map(); // roomId -> Room
  }

  /**
   * Create a new room
   * @param {string} hostId - Host player socket ID
   * @param {string} hostName - Host player name
   * @returns {Object} - { roomId, playerId }
   */
  createRoom(hostId, hostName) {
    const roomId = this.generateRoomId();
    const room = new Room(roomId, hostId, hostName);
    
    this.rooms.set(roomId, room);
    
    console.log(`Room created: ${roomId} by ${hostName} (${hostId})`);
    
    return {
      roomId,
      playerId: hostId,
      playerName: hostName,
    };
  }

  /**
   * Join an existing room
   * @param {string} roomId - Room ID
   * @param {string} playerId - Player socket ID
   * @param {string} playerName - Player name
   * @returns {Object} - { success: boolean, room: Object, error: string }
   */
  joinRoom(roomId, playerId, playerName) {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      return { success: false, error: 'Room not found' };
    }
    
    if (room.players.white !== null) {
      return { success: false, error: 'Room is full' };
    }
    
    const success = room.addPlayer(playerId, playerName);
    
    if (!success) {
      return { success: false, error: 'Failed to join room' };
    }
    
    console.log(`Player joined: ${playerName} (${playerId}) joined room ${roomId}`);
    
    return {
      success: true,
      room: room.toJSON(),
      playerId,
      playerName,
    };
  }

  /**
   * Get room by ID
   * @param {string} roomId - Room ID
   * @returns {Room|undefined} - Room object or undefined
   */
  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  /**
   * Remove a player from a room
   * @param {string} roomId - Room ID
   * @param {string} playerId - Player socket ID
   */
  removePlayer(roomId, playerId) {
    const room = this.rooms.get(roomId);
    
    if (room) {
      room.removePlayer(playerId);
      
      // If both players left, delete the room
      if (!room.players.black && !room.players.white) {
        this.rooms.delete(roomId);
        console.log(`Room deleted: ${roomId}`);
      }
    }
  }

  /**
   * Generate a unique room ID (4 uppercase letters)
   * @returns {string} - Room ID
   */
  generateRoomId() {
    let roomId;
    do {
      roomId = uuidv4().substring(0, 4).toUpperCase();
    } while (this.rooms.has(roomId));
    
    return roomId;
  }

  /**
   * Get number of active rooms
   * @returns {number} - Number of rooms
   */
  getRoomCount() {
    return this.rooms.size;
  }
}

module.exports = {
  Room,
  GameManager,
};
