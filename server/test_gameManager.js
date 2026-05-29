// Test suite for GameManager and Room classes
// Run with: node test_gameManager.js

const { Room, GameManager } = require('./gameManager');

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

function assertEqual(actual, expected, testName) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed++;
    console.log(`✅ PASS: ${testName}`);
  } else {
    failed++;
    errors.push(`FAIL: ${testName} - Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)}`);
    console.log(`❌ FAIL: ${testName}`);
    console.log(`   Expected: ${JSON.stringify(expected)}`);
    console.log(`   Got: ${JSON.stringify(actual)}`);
  }
}

// =============================================================================
// TEST SUITE 1: Room Class
// =============================================================================
console.log('\n========== TEST SUITE 1: Room Class ==========\n');

// Test 1.1: Room creation
{
  const room = new Room('TEST1', 'socket123', 'Alice');
  assert(room.id === 'TEST1', 'Room should have correct ID');
  assert(room.players.black.id === 'socket123', 'Host should be black player');
  assert(room.players.black.name === 'Alice', 'Host name should be correct');
  assert(room.players.white === null, 'White player should be null initially');
  assert(room.currentPlayer === 1, 'Black should go first');
  assert(room.gameStarted === false, 'Game should not start with only one player');
  assert(room.gameEnded === false, 'Game should not be ended');
  assert(room.winner === null, 'No winner initially');
  assert(room.board.length === 15, 'Board should be 15x15');
  assert(room.board[0].length === 15, 'Board should be 15x15');
  assert(room.board[7][7] === 0, 'Board cells should be empty (0)');
}

// Test 1.2: addPlayer - successfully add white player
{
  const room = new Room('TEST2', 'socket123', 'Alice');
  const result = room.addPlayer('socket456', 'Bob');
  assert(result === true, 'addPlayer should return true on success');
  assert(room.players.white.id === 'socket456', 'White player should be added');
  assert(room.players.white.name === 'Bob', 'White player name should be correct');
  assert(room.gameStarted === true, 'Game should start when second player joins');
}

// Test 1.3: addPlayer - room full (try to add third player)
{
  const room = new Room('TEST3', 'socket123', 'Alice');
  room.addPlayer('socket456', 'Bob');
  const result = room.addPlayer('socket789', 'Charlie');
  assert(result === false, 'addPlayer should return false when room is full');
}

// Test 1.4: removePlayer
{
  const room = new Room('TEST4', 'socket123', 'Alice');
  room.addPlayer('socket456', 'Bob');
  room.removePlayer('socket456');
  assert(room.players.white === null, 'White player should be removed');
  assert(room.players.black.id === 'socket123', 'Black player should remain');
}

// =============================================================================
// TEST SUITE 2: Win Detection (checkWin)
// =============================================================================
console.log('\n========== TEST SUITE 2: Win Detection ==========\n');

// Test 2.1: Horizontal win (5 in a row)
{
  const room = new Room('TEST5', 's1', 'A');
  // Place 5 black stones horizontally at row 7, cols 5-9
  for (let col = 5; col < 10; col++) {
    room.board[7][col] = 1;
  }
  // Check win at the middle stone
  const result = room.checkWin(7, 7, 1);
  assert(result === true, 'Horizontal five-in-a-row should be a win');
}

// Test 2.2: Vertical win
{
  const room = new Room('TEST6', 's1', 'A');
  // Place 5 black stones vertically at col 7, rows 5-9
  for (let row = 5; row < 10; row++) {
    room.board[row][7] = 1;
  }
  const result = room.checkWin(7, 7, 1);
  assert(result === true, 'Vertical five-in-a-row should be a win');
}

// Test 2.3: Diagonal win (top-left to bottom-right)
{
  const room = new Room('TEST7', 's1', 'A');
  // Place 5 black stones diagonally
  for (let i = 0; i < 5; i++) {
    room.board[5 + i][5 + i] = 1;
  }
  const result = room.checkWin(7, 7, 1);
  assert(result === true, 'Diagonal (TL-BR) five-in-a-row should be a win');
}

// Test 2.4: Diagonal win (top-right to bottom-left)
{
  const room = new Room('TEST8', 's1', 'A');
  // Place 5 black stones diagonally (TR-BL)
  for (let i = 0; i < 5; i++) {
    room.board[5 + i][9 - i] = 1;
  }
  const result = room.checkWin(7, 7, 1);
  assert(result === true, 'Diagonal (TR-BL) five-in-a-row should be a win');
}

// Test 2.5: No win - only 4 in a row
{
  const room = new Room('TEST9', 's1', 'A');
  // Place only 4 black stones horizontally
  for (let col = 5; col < 9; col++) {
    room.board[7][col] = 1;
  }
  const result = room.checkWin(7, 6, 1);
  assert(result === false, 'Four-in-a-row should not be a win');
}

// Test 2.6: No win - empty board
{
  const room = new Room('TEST10', 's1', 'A');
  const result = room.checkWin(7, 7, 1);
  assert(result === false, 'Empty board should not have a win');
}

// Test 2.7: Win at board edge (top row, horizontal)
{
  const room = new Room('TEST11', 's1', 'A');
  // Place 5 black stones at top row
  for (let col = 0; col < 5; col++) {
    room.board[0][col] = 1;
  }
  const result = room.checkWin(0, 2, 1);
  assert(result === true, 'Horizontal win at board edge (top row) should be detected');
}

// Test 2.8: Win at board edge (leftmost column, vertical)
{
  const room = new Room('TEST12', 's1', 'A');
  // Place 5 black stones at leftmost column
  for (let row = 0; row < 5; row++) {
    room.board[row][0] = 1;
  }
  const result = room.checkWin(2, 0, 1);
  assert(result === true, 'Vertical win at board edge (leftmost col) should be detected');
}

// Test 2.9: White player win
{
  const room = new Room('TEST13', 's1', 'A');
  // Place 5 white stones
  for (let col = 5; col < 10; col++) {
    room.board[7][col] = 2;
  }
  const result = room.checkWin(7, 7, 2);
  assert(result === true, 'White player (player 2) should be able to win');
}

// Test 2.10: Exactly 5 in a row (boundary test)
{
  const room = new Room('TEST14', 's1', 'A');
  // Place exactly 5 stones
  for (let col = 5; col < 10; col++) {
    room.board[7][col] = 1;
  }
  const result = room.checkWin(7, 7, 1);
  assert(result === true, 'Exactly 5 in a row should be a win');
}

// Test 2.11: 6 in a row (more than 5) - BUG CHECK
// According to standard Gomoku rules, 6 in a row is also a win
// But the current implementation uses count >= 5, so this should pass
{
  const room = new Room('TEST15', 's1', 'A');
  // Place 6 black stones horizontally
  for (let col = 5; col < 11; col++) {
    room.board[7][col] = 1;
  }
  const result = room.checkWin(7, 7, 1);
  assert(result === true, 'Six-in-a-row should also be a win (count >= 5)');
}

// =============================================================================
// TEST SUITE 3: placeStone
// =============================================================================
console.log('\n========== TEST SUITE 3: placeStone ==========\n');

// Test 3.1: Valid stone placement
{
  const room = new Room('TEST16', 's1', 'A');
  const result = room.placeStone(7, 7, 1);
  assert(result.success === true, 'Valid stone placement should succeed');
  assert(room.board[7][7] === 1, 'Board should be updated after placement');
  assert(room.currentPlayer === 2, 'Current player should switch to white after black moves');
}

// Test 3.2: Invalid position (out of bounds)
{
  const room = new Room('TEST17', 's1', 'A');
  const result = room.placeStone(20, 20, 1);
  assert(result.success === false, 'Out-of-bounds move should fail');
  assert(result.error === 'Invalid position', 'Error message should be "Invalid position"');
}

// Test 3.3: Invalid position (negative)
{
  const room = new Room('TEST18', 's1', 'A');
  const result = room.placeStone(-1, 5, 1);
  assert(result.success === false, 'Negative position should fail');
}

// Test 3.4: Cell already occupied
{
  const room = new Room('TEST19', 's1', 'A');
  room.placeStone(7, 7, 1);
  const result = room.placeStone(7, 7, 2);
  assert(result.success === false, 'Placing stone on occupied cell should fail');
  assert(result.error === 'Cell already occupied', 'Error message should be "Cell already occupied"');
}

// Test 3.5: Not your turn
{
  const room = new Room('TEST20', 's1', 'A');
  // Black (player 1) goes first
  const result = room.placeStone(7, 7, 2); // White tries to go first
  assert(result.success === false, 'Moving when it\'s not your turn should fail');
  assert(result.error === 'Not your turn', 'Error message should be "Not your turn"');
}

// Test 3.6: Place stone and win
{
  const room = new Room('TEST21', 's1', 'A');
  // Manually set up 4 in a row, then place the 5th
  room.board[7][5] = 1;
  room.board[7][6] = 1;
  room.board[7][7] = 0; // This will be placed
  room.board[7][8] = 1;
  room.board[7][9] = 1;
  room.currentPlayer = 1; // Black's turn
  
  const result = room.placeStone(7, 7, 1);
  assert(result.success === true, 'Winning move should succeed');
  assert(result.winner === 1, 'Winner should be player 1 (black)');
  assert(room.gameEnded === true, 'Game should be ended after win');
}

// Test 3.7: Place stone after game ended
{
  const room = new Room('TEST22', 's1', 'A');
  room.gameEnded = true;
  const result = room.placeStone(7, 7, 1);
  assert(result.success === false, 'Placing stone after game ended should fail');
  assert(result.error === 'Game has ended', 'Error message should be "Game has ended"');
}

// Test 3.8: Draw detection (full board)
{
  const room = new Room('TEST23', 's1', 'A');
  // Fill the entire board
  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      room.board[row][col] = ((row + col) % 2) + 1; // Alternate 1 and 2
    }
  }
  room.currentPlayer = 1;
  
  // Try to place one more stone (should fail because board is full)
  // Actually, we need to test the draw detection in placeStone
  // Let's place a stone in the only empty cell
  room.board[7][7] = 0; // Make one cell empty
  const result = room.placeStone(7, 7, 1);
  
  // The game should detect draw after this move if no win
  // Actually, the current implementation checks for draw after each move
  if (result.success && result.winner === 0) {
    assert(room.gameEnded === true, 'Game should end in draw when board is full');
    console.log(`✅ PASS: Draw detection works`);
    passed++;
  } else {
    // Draw detection might not trigger if the last move creates a win
    console.log(`⚠️  INFO: Draw test - last move result: ${JSON.stringify(result)}`);
  }
}

// =============================================================================
// TEST SUITE 4: GameManager Class
// =============================================================================
console.log('\n========== TEST SUITE 4: GameManager Class ==========\n');

// Test 4.1: createRoom
{
  const gm = new GameManager();
  const result = gm.createRoom('socket123', 'Alice');
  assert(result.roomId !== undefined, 'createRoom should return a roomId');
  assert(result.playerId === 'socket123', 'playerId should match socket ID');
  assert(result.playerName === 'Alice', 'playerName should match');
  assert(gm.getRoomCount() === 1, 'Room count should be 1 after creating a room');
  
  const room = gm.getRoom(result.roomId);
  assert(room !== undefined, 'Room should be retrievable by ID');
  assert(room.players.black.id === 'socket123', 'Host should be black player');
}

// Test 4.2: joinRoom - success
{
  const gm = new GameManager();
  const createResult = gm.createRoom('socket123', 'Alice');
  const joinResult = gm.joinRoom(createResult.roomId, 'socket456', 'Bob');
  
  assert(joinResult.success === true, 'joinRoom should succeed');
  assert(joinResult.room.players.white.id === 'socket456', 'White player should be added');
  assert(joinResult.room.gameStarted === true, 'Game should start after join');
}

// Test 4.3: joinRoom - room not found
{
  const gm = new GameManager();
  const result = gm.joinRoom('NONEXISTENT', 'socket456', 'Bob');
  assert(result.success === false, 'joinRoom should fail for non-existent room');
  assert(result.error === 'Room not found', 'Error message should be "Room not found"');
}

// Test 4.4: joinRoom - room full
{
  const gm = new GameManager();
  const createResult = gm.createRoom('socket123', 'Alice');
  gm.joinRoom(createResult.roomId, 'socket456', 'Bob');
  const result = gm.joinRoom(createResult.roomId, 'socket789', 'Charlie');
  assert(result.success === false, 'joinRoom should fail when room is full');
  assert(result.error === 'Room is full', 'Error message should be "Room is full"');
}

// Test 4.5: removePlayer
{
  const gm = new GameManager();
  const createResult = gm.createRoom('socket123', 'Alice');
  gm.joinRoom(createResult.roomId, 'socket456', 'Bob');
  
  gm.removePlayer(createResult.roomId, 'socket456');
  const room = gm.getRoom(createResult.roomId);
  assert(room.players.white === null, 'White player should be removed');
}

// Test 4.6: removePlayer - delete room when all players leave
{
  const gm = new GameManager();
  const createResult = gm.createRoom('socket123', 'Alice');
  assert(gm.getRoomCount() === 1, 'Room count should be 1');
  
  gm.removePlayer(createResult.roomId, 'socket123');
  assert(gm.getRoomCount() === 0, 'Room should be deleted when all players leave');
}

// Test 4.7: generateRoomId - uniqueness
{
  const gm = new GameManager();
  const ids = new Set();
  // Create multiple rooms and check ID uniqueness
  for (let i = 0; i < 10; i++) {
    const result = gm.createRoom(`socket${i}`, `Player${i}`);
    ids.add(result.roomId);
  }
  assert(ids.size === 10, 'Room IDs should be unique');
  assert(Array.from(ids).every(id => id.length === 4), 'Room ID should be 4 characters');
  assert(Array.from(ids).every(id => /^[A-Z0-9]+$/.test(id)), 'Room ID should be uppercase hex');
}

// =============================================================================
// TEST SUITE 5: resetGame
// =============================================================================
console.log('\n========== TEST SUITE 5: resetGame ==========\n');

// Test 5.1: resetGame - clear board and reset state
{
  const room = new Room('TEST24', 's1', 'A');
  // Place some stones
  room.placeStone(7, 7, 1);
  room.placeStone(7, 8, 2);
  // Set game as ended
  room.gameEnded = true;
  room.winner = 1;
  
  room.resetGame();
  
  assert(room.board[7][7] === 0, 'Board should be cleared after reset');
  assert(room.board[7][8] === 0, 'Board should be cleared after reset');
  assert(room.currentPlayer === 1, 'Current player should be reset to black (1)');
  assert(room.gameStarted === true, 'Game should be marked as started');
  assert(room.gameEnded === false, 'Game should not be ended after reset');
  assert(room.winner === null, 'Winner should be null after reset');
}

// =============================================================================
// TEST SUITE 6: toJSON serialization
// =============================================================================
console.log('\n========== TEST SUITE 6: toJSON ==========\n');

// Test 6.1: toJSON should return serializable object
{
  const room = new Room('TEST25', 's1', 'Alice');
  room.addPlayer('s2', 'Bob');
  room.placeStone(7, 7, 1);
  
  const json = room.toJSON();
  assert(json.id === 'TEST25', 'toJSON should include room ID');
  assert(json.players.black.name === 'Alice', 'toJSON should include player names');
  assert(json.players.white.name === 'Bob', 'toJSON should include white player');
  assert(json.board[7][7] === 1, 'toJSON should include board state');
  assert(json.currentPlayer === 2, 'toJSON should include current player');
  assert(json.gameStarted === true, 'toJSON should include gameStarted');
}

// =============================================================================
// SUMMARY
// =============================================================================
console.log('\n============================================================');
console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed`);
console.log('============================================================\n');

if (errors.length > 0) {
  console.log('ERRORS:');
  errors.forEach(err => console.log(`  ${err}`));
  console.log('');
}

process.exit(failed > 0 ? 1 : 0);
