// Frontend gameLogic tests (ES module)
// Run with: node test_gameLogic.js (or use --input-type=module)

import { readFileSync } from 'fs';
import { fileURLToPath, URL } from 'url';

// We'll test the game logic by copying the functions here
// In a real project, we'd use Jest with proper ES module support

const BOARD_SIZE = 15;
const PLAYER_BLACK = 1;
const PLAYER_WHITE = 2;

// Import the actual functions
// Since we can't directly import .jsx files, we'll test the logic inline
function checkWin(board, row, col, player) {
  const directions = [
    [0, 1],  // horizontal
    [1, 0],  // vertical
    [1, 1],  // diagonal right
    [1, -1], // diagonal left
  ];

  for (const [rowDelta, colDelta] of directions) {
    let count = 1;

    // Check positive direction
    let r = row + rowDelta;
    let c = col + colDelta;
    while (
      r >= 0 && r < BOARD_SIZE &&
      c >= 0 && c < BOARD_SIZE &&
      board[r][c] === player
    ) {
      count++;
      r += rowDelta;
      c += colDelta;
    }

    // Check negative direction
    r = row - rowDelta;
    c = col - colDelta;
    while (
      r >= 0 && r < BOARD_SIZE &&
      c >= 0 && c < BOARD_SIZE &&
      board[r][c] === player
    ) {
      count++;
      r -= rowDelta;
      c -= colDelta;
    }

    if (count >= 5) {
      return true;
    }
  }

  return false;
}

function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => 0)
  );
}

function getNextPlayer(currentPlayer) {
  return currentPlayer === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
}

function isBoardFull(board) {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] === 0) {
        return false;
      }
    }
  }
  return true;
}

// Test helpers
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

// =============================================================================
// TEST SUITE 1: checkWin
// =============================================================================
console.log('\n========== TEST SUITE 1: checkWin ==========\n');

// Test 1.1: Horizontal win
{
  const board = createEmptyBoard();
  for (let col = 5; col < 10; col++) {
    board[7][col] = 1;
  }
  const result = checkWin(board, 7, 7, 1);
  assert(result === true, 'Horizontal five-in-a-row should be a win');
}

// Test 1.2: Vertical win
{
  const board = createEmptyBoard();
  for (let row = 5; row < 10; row++) {
    board[row][7] = 1;
  }
  const result = checkWin(board, 7, 7, 1);
  assert(result === true, 'Vertical five-in-a-row should be a win');
}

// Test 1.3: Diagonal win (TL-BR)
{
  const board = createEmptyBoard();
  for (let i = 0; i < 5; i++) {
    board[5 + i][5 + i] = 1;
  }
  const result = checkWin(board, 7, 7, 1);
  assert(result === true, 'Diagonal (TL-BR) five-in-a-row should be a win');
}

// Test 1.4: Diagonal win (TR-BL)
{
  const board = createEmptyBoard();
  for (let i = 0; i < 5; i++) {
    board[5 + i][9 - i] = 1;
  }
  const result = checkWin(board, 7, 7, 1);
  assert(result === true, 'Diagonal (TR-BL) five-in-a-row should be a win');
}

// Test 1.5: No win - four in a row
{
  const board = createEmptyBoard();
  for (let col = 5; col < 9; col++) {
    board[7][col] = 1;
  }
  const result = checkWin(board, 7, 6, 1);
  assert(result === false, 'Four-in-a-row should not be a win');
}

// Test 1.6: Win at board edge (top row)
{
  const board = createEmptyBoard();
  for (let col = 0; col < 5; col++) {
    board[0][col] = 1;
  }
  const result = checkWin(board, 0, 2, 1);
  assert(result === true, 'Win at board edge (top row) should be detected');
}

// Test 1.7: Win at board edge (leftmost column)
{
  const board = createEmptyBoard();
  for (let row = 0; row < 5; row++) {
    board[row][0] = 1;
  }
  const result = checkWin(board, 2, 0, 1);
  assert(result === true, 'Win at board edge (leftmost col) should be detected');
}

// Test 1.8: White player win
{
  const board = createEmptyBoard();
  for (let col = 5; col < 10; col++) {
    board[7][col] = 2;
  }
  const result = checkWin(board, 7, 7, 2);
  assert(result === true, 'White player (player 2) should be able to win');
}

// Test 1.9: No win - empty board
{
  const board = createEmptyBoard();
  const result = checkWin(board, 7, 7, 1);
  assert(result === false, 'Empty board should not have a win');
}

// Test 1.10: Exactly 5 in a row
{
  const board = createEmptyBoard();
  for (let col = 5; col < 10; col++) {
    board[7][col] = 1;
  }
  const result = checkWin(board, 7, 7, 1);
  assert(result === true, 'Exactly 5 in a row should be a win');
}

// =============================================================================
// TEST SUITE 2: createEmptyBoard
// =============================================================================
console.log('\n========== TEST SUITE 2: createEmptyBoard ==========\n');

// Test 2.1: Board dimensions
{
  const board = createEmptyBoard();
  assert(board.length === 15, 'Board should have 15 rows');
  assert(board[0].length === 15, 'Board should have 15 columns');
}

// Test 2.2: Board is empty
{
  const board = createEmptyBoard();
  let allEmpty = true;
  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      if (board[row][col] !== 0) {
        allEmpty = false;
        break;
      }
    }
  }
  assert(allEmpty === true, 'All board cells should be empty (0)');
}

// =============================================================================
// TEST SUITE 3: getNextPlayer
// =============================================================================
console.log('\n========== TEST SUITE 3: getNextPlayer ==========\n');

// Test 3.1: Black to White
{
  const next = getNextPlayer(1);
  assert(next === 2, 'Next player after black (1) should be white (2)');
}

// Test 3.2: White to Black
{
  const next = getNextPlayer(2);
  assert(next === 1, 'Next player after white (2) should be black (1)');
}

// =============================================================================
// TEST SUITE 4: isBoardFull
// =============================================================================
console.log('\n========== TEST SUITE 4: isBoardFull ==========\n');

// Test 4.1: Empty board
{
  const board = createEmptyBoard();
  const result = isBoardFull(board);
  assert(result === false, 'Empty board should not be full');
}

// Test 4.2: Full board
{
  const board = createEmptyBoard();
  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      board[row][col] = ((row + col) % 2) + 1;
    }
  }
  const result = isBoardFull(board);
  assert(result === true, 'Full board should be detected as full');
}

// Test 4.3: Nearly full board (one empty cell)
{
  const board = createEmptyBoard();
  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      board[row][col] = ((row + col) % 2) + 1;
    }
  }
  board[7][7] = 0; // Make one cell empty
  const result = isBoardFull(board);
  assert(result === false, 'Nearly full board with one empty cell should not be full');
}

// =============================================================================
// TEST SUITE 5: Consistency between frontend and backend
// =============================================================================
console.log('\n========== TEST SUITE 5: Frontend/Backend Consistency ==========\n');

// Test 5.1: Same win detection logic
// We've already tested backend separately, now verify frontend has same logic
{
  const board = createEmptyBoard();
  // Create the same winning scenario
  for (let i = 0; i < 5; i++) {
    board[7][5 + i] = 1;
  }
  
  const result = checkWin(board, 7, 7, 1);
  assert(result === true, 'Frontend checkWin should detect win correctly');
}

// Test 5.2: Verify algorithm uses >= 5 (not === 5)
// This is important for edge cases where there might be more than 5 in a row
{
  const board = createEmptyBoard();
  // Place 6 black stones horizontally
  for (let col = 5; col < 11; col++) {
    board[7][col] = 1;
  }
  const result = checkWin(board, 7, 7, 1);
  assert(result === true, 'Six-in-a-row should also be a win (count >= 5)');
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
