import { BOARD_SIZE, PLAYER_BLACK, PLAYER_WHITE } from '../constants';

/**
 * Check if a player has won after placing a stone at (row, col)
 * Checks four directions: horizontal, vertical, diagonal-left, diagonal-right
 * @param {number[][]} board - 15x15 board array
 * @param {number} row - Row index of the last move
 * @param {number} col - Column index of the last move
 * @param {number} player - Player number (1 or 2)
 * @returns {boolean} - True if the player has won
 */
export function checkWin(board, row, col, player) {
  // Four directions to check: [rowDelta, colDelta]
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

    // Five in a row means win
    if (count >= 5) {
      return true;
    }
  }

  return false;
}

/**
 * Create an empty board (15x15, all zeros)
 * @returns {number[][]} - Empty board array
 */
export function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => 0)
  );
}

/**
 * Get the next player
 * @param {number} currentPlayer - Current player (1 or 2)
 * @returns {number} - Next player (2 or 1)
 */
export function getNextPlayer(currentPlayer) {
  return currentPlayer === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
}

/**
 * Check if the board is full (draw)
 * @param {number[][]} board - Board array
 * @returns {boolean} - True if board is full
 */
export function isBoardFull(board) {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] === 0) {
        return false;
      }
    }
  }
  return true;
}
