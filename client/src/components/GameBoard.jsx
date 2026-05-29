import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import love8Theme from '../theme/love8Theme';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  Alert,
  Chip,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { checkWin, createEmptyBoard } from '../utils/gameLogic';
import { BOARD_SIZE, PLAYER_BLACK, PLAYER_WHITE } from '../constants';

/**
 * AI logic: returns [row, col] for AI move
 * Strategy: 1) win if possible, 2) block player, 3) random
 */
function getAIMove(board) {
  // Helper: check if placing at (r,c) gives 'player' a win
  function wouldWin(r, c, player) {
    if (board[r][c] !== 0) return false;
    board[r][c] = player;
    const result = checkWin(board, r, c, player);
    board[r][c] = 0;
    return result;
  }

  // 1. AI wins?
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 0 && wouldWin(r, c, PLAYER_WHITE)) {
        return [r, c];
      }
    }
  }

  // 2. Block player?
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 0 && wouldWin(r, c, PLAYER_BLACK)) {
        return [r, c];
      }
    }
  }

  // 3. Prefer center area, then random
  const candidates = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 0) candidates.push([r, c]);
    }
  }
  if (candidates.length === 0) return null;

  // Prefer positions near existing stones
  const weighted = candidates.sort((a, b) => {
    const scoreA = countNeighbors(board, a[0], a[1]);
    const scoreB = countNeighbors(board, b[0], b[1]);
    return scoreB - scoreA;
  });
  // Pick from top 5 weighted candidates randomly
  const top = weighted.slice(0, Math.min(5, weighted.length));
  return top[Math.floor(Math.random() * top.length)];
}

function countNeighbors(board, row, col) {
  let count = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr, nc = col + dc;
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] !== 0) {
        count++;
      }
    }
  }
  return count;
}

function GameBoard() {
  const [board, setBoard] = useState(createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState(PLAYER_BLACK);
  const [gameEnded, setGameEnded] = useState(false);
  const [winner, setWinner] = useState(null);
  const [aiThinking, setAiThinking] = useState(false);

  const canvasRef = useRef(null);
  const boardRef = useRef(board);

  // Keep boardRef in sync
  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  // Draw board on mount and when board changes
  useEffect(() => {
    drawBoard();
    drawStones(board);
  }, [board]);

  // AI move effect
  useEffect(() => {
    if (currentPlayer === PLAYER_WHITE && !gameEnded) {
      setAiThinking(true);
      const timer = setTimeout(() => {
        const move = getAIMove(board);
        if (move) {
          const [row, col] = move;
          const newBoard = board.map(r => [...r]);
          newBoard[row][col] = PLAYER_WHITE;

          let newWinner = null;
          if (checkWin(newBoard, row, col, PLAYER_WHITE)) {
            newWinner = PLAYER_WHITE;
          } else if (isBoardFull(newBoard)) {
            newWinner = 0; // draw
          }

          setBoard(newBoard);
          boardRef.current = newBoard;

          if (newWinner !== null) {
            setGameEnded(true);
            setWinner(newWinner);
          } else {
            setCurrentPlayer(PLAYER_BLACK);
          }
        }
        setAiThinking(false);
      }, 500); // slight delay for UX
      return () => clearTimeout(timer);
    }
  }, [currentPlayer, gameEnded]);

  // Draw board grid
  const drawBoard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cellSize = canvas.width / (BOARD_SIZE + 1);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#F8BBD0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = '#E91E63';
    ctx.lineWidth = 1;
    for (let i = 0; i < BOARD_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(cellSize * (i + 1), cellSize);
      ctx.lineTo(cellSize * (i + 1), cellSize * BOARD_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cellSize, cellSize * (i + 1));
      ctx.lineTo(cellSize * BOARD_SIZE, cellSize * (i + 1));
      ctx.stroke();
    }

    // Star points
    const starPoints = [[3,3],[3,11],[11,3],[11,11],[7,7]];
    ctx.fillStyle = '#E91E63';
    starPoints.forEach(([r, c]) => {
      ctx.beginPath();
      ctx.arc(cellSize * (c + 1), cellSize * (r + 1), 4, 0, 2 * Math.PI);
      ctx.fill();
    });
  }, []);

  // Draw stones
  const drawStones = useCallback((boardData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cellSize = canvas.width / (BOARD_SIZE + 1);

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (boardData[row][col] !== 0) {
          const x = cellSize * (col + 1);
          const y = cellSize * (row + 1);
          const radius = cellSize * 0.38;

          // Shadow
          ctx.beginPath();
          ctx.arc(x + 2, y + 2, radius, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.fill();

          // Stone gradient
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, 2 * Math.PI);
          if (boardData[row][col] === PLAYER_BLACK) {
            const g = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, radius);
            g.addColorStop(0, '#555');
            g.addColorStop(1, '#000');
            ctx.fillStyle = g;
          } else {
            const g = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, radius);
            g.addColorStop(0, '#FFF');
            g.addColorStop(1, '#DDD');
            ctx.fillStyle = g;
          }
          ctx.fill();
          ctx.strokeStyle = '#999';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
  }, []);

  // Handle canvas click
  const handleCanvasClick = useCallback((e) => {
    if (gameEnded || currentPlayer !== PLAYER_BLACK || aiThinking) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cellSize = canvas.width / (BOARD_SIZE + 1);
    const col = Math.round(x / cellSize) - 1;
    const row = Math.round(y / cellSize) - 1;

    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return;
    if (boardRef.current[row][col] !== 0) return;

    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = PLAYER_BLACK;

    let newWinner = null;
    if (checkWin(newBoard, row, col, PLAYER_BLACK)) {
      newWinner = PLAYER_BLACK;
    } else if (isBoardFull(newBoard)) {
      newWinner = 0;
    }

    setBoard(newBoard);
    boardRef.current = newBoard;

    if (newWinner !== null) {
      setGameEnded(true);
      setWinner(newWinner);
    } else {
      setCurrentPlayer(PLAYER_WHITE); // AI's turn
    }
  }, [gameEnded, currentPlayer, aiThinking]);

  // Restart
  const handleRestart = () => {
    setBoard(createEmptyBoard());
    boardRef.current = createEmptyBoard();
    setCurrentPlayer(PLAYER_BLACK);
    setGameEnded(false);
    setWinner(null);
    setAiThinking(false);
  };

  const getGameStatus = () => {
    if (gameEnded) {
      if (winner === PLAYER_BLACK) return '🎉 你赢了！';
      if (winner === PLAYER_WHITE) return '😢 AI 赢了';
      return '平局！';
    }
    if (aiThinking) return '🤔 AI 思考中...';
    if (currentPlayer === PLAYER_BLACK) return '你的回合（黑棋）';
    return 'AI 回合';
  };

  return (
    <ThemeProvider theme={love8Theme}>
      <Container maxWidth="md" sx={{ py: 2 }}>
        {/* Header */}
        <Paper elevation={3} sx={{ p: 2, mb: 2, borderRadius: 3, background: 'linear-gradient(135deg, #FCE4EC, #F8BBD0)' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6" fontWeight="bold" color="#E91E63">
                <FavoriteIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Love8 五子棋 · 单人模式
              </Typography>
              <Typography variant="body2" color="text.secondary">
                你是黑棋，AI 是白棋
              </Typography>
            </Box>
            <Chip label={getGameStatus()} color={gameEnded ? (winner === PLAYER_BLACK ? 'success' : 'default') : 'primary'} />
          </Stack>
        </Paper>

        {/* Game Result */}
        {gameEnded && (
          <Alert severity={winner === PLAYER_BLACK ? 'success' : winner === 0 ? 'info' : 'warning'} sx={{ mb: 2 }}
            action={<Button color="inherit" size="small" onClick={handleRestart}>再来一局</Button>}>
            {getGameStatus()}
          </Alert>
        )}

        {/* Canvas */}
        <Paper elevation={6} sx={{ p: 2, borderRadius: 3, textAlign: 'center' }}>
          <canvas
            ref={canvasRef}
            width={560}
            height={560}
            onClick={handleCanvasClick}
            style={{ cursor: gameEnded ? 'default' : 'pointer', maxWidth: '100%', height: 'auto' }}
          />
        </Paper>

        {/* Controls */}
        <Stack direction="row" spacing={2} justifyContent="center" mt={2}>
          <Button variant="outlined" startIcon={<RestartAltIcon />} onClick={handleRestart}>
            重新开始
          </Button>
          <Button variant="text" onClick={() => window.location.href = '/'}>
            返回大厅
          </Button>
        </Stack>
      </Container>
    </ThemeProvider>
  );
}

function isBoardFull(board) {
  for (let r = 0; r < BOARD_SIZE; r++)
    for (let c = 0; c < BOARD_SIZE; c++)
      if (board[r][c] === 0) return false;
  return true;
}

export default GameBoard;
