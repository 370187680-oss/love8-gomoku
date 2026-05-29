import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  LinearProgress,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useSocket } from '../hooks/useSocket';
import { SOCKET_EVENTS, BOARD_SIZE, PLAYER_BLACK, PLAYER_WHITE } from '../constants';

function GameBoard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { socket, isConnected, placeStone, requestRestart, on, off } = useSocket();

  const { roomId, playerId, playerRole, playerName, currentPlayer: initialCurrentPlayer } = location.state || {};

  const [board, setBoard] = useState(
    Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0))
  );
  const [currentPlayer, setCurrentPlayer] = useState(initialCurrentPlayer || PLAYER_BLACK);
  const [gameEnded, setGameEnded] = useState(false);
  const [winner, setWinner] = useState(null);
  const [opponentName, setOpponentName] = useState('');

  const canvasRef = useRef(null);
  const boardRef = useRef(board);

  const isBlack = playerRole === 'black';
  const myPlayerNum = isBlack ? PLAYER_BLACK : PLAYER_WHITE;

  // Keep boardRef in sync
  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  // Redirect if no room data
  useEffect(() => {
    if (!roomId || !playerRole) {
      navigate('/');
    }
  }, [roomId, playerRole, navigate]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleGameStarted = (data) => {
      console.log('Game started:', data);
      setCurrentPlayer(data.currentPlayer);
    };

    const handleStonePlaced = (data) => {
      setBoard(data.board);
      boardRef.current = data.board;
      setCurrentPlayer(data.nextPlayer);
    };

    const handleGameOver = (data) => {
      setBoard(data.board);
      boardRef.current = data.board;
      setGameEnded(true);
      setWinner(data.winner);
    };

    const handleGameRestarted = (data) => {
      setBoard(data.board);
      boardRef.current = data.board;
      setCurrentPlayer(data.currentPlayer);
      setGameEnded(false);
      setWinner(null);
    };

    const handleOpponentDisconnected = (data) => {
      setGameEnded(true);
      setWinner(myPlayerNum);
      alert(`${data.message || '对手断线了'} 🙏`);
    };

    on(SOCKET_EVENTS.GAME_STARTED, handleGameStarted);
    on(SOCKET_EVENTS.STONE_PLACED, handleStonePlaced);
    on(SOCKET_EVENTS.GAME_OVER, handleGameOver);
    on(SOCKET_EVENTS.GAME_RESTARTED, handleGameRestarted);
    on(SOCKET_EVENTS.OPPONENT_DISCONNECTED, handleOpponentDisconnected);

    return () => {
      off(SOCKET_EVENTS.GAME_STARTED, handleGameStarted);
      off(SOCKET_EVENTS.STONE_PLACED, handleStonePlaced);
      off(SOCKET_EVENTS.GAME_OVER, handleGameOver);
      off(SOCKET_EVENTS.GAME_RESTARTED, handleGameRestarted);
      off(SOCKET_EVENTS.OPPONENT_DISCONNECTED, handleOpponentDisconnected);
    };
  }, [socket, on, off, myPlayerNum]);

  // Draw board
  const drawBoard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cellSize = canvas.width / (BOARD_SIZE + 1);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#F5DEB3';
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

    drawBoard();

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
  }, [drawBoard]);

  // Redraw when board changes
  useEffect(() => {
    drawStones(board);
  }, [board, drawStones]);

  // Initial board draw
  useEffect(() => {
    drawBoard();
  }, [drawBoard]);

  // Handle canvas click
  const handleCanvasClick = useCallback((e) => {
    if (gameEnded) return;
    if (!isConnected) return;
    if (currentPlayer !== myPlayerNum) return; // Not my turn

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

    // Send move to server
    placeStone(row, col, roomId, myPlayerNum);
  }, [gameEnded, isConnected, currentPlayer, myPlayerNum, roomId, placeStone]);

  // Restart
  const handleRestart = () => {
    if (!isConnected || !roomId) return;
    requestRestart(roomId);
  };

  const getGameStatus = () => {
    if (!isConnected) return '⚠️ 连接断开';
    if (gameEnded) {
      if (winner === myPlayerNum) return '🎉 你赢了！';
      if (winner === 0) return '😐 平局！';
      return '😢 你输了';
    }
    if (currentPlayer === myPlayerNum) return '✏️ 你的回合';
    return '⏳ 对方思考中...';
  };

  const getPlayerLabel = () => {
    return isBlack ? '⚫ 你是黑棋（先手）' : '⚪ 你是白棋';
  };

  if (!roomId || !playerRole) {
    return null; // Will redirect
  }

  return (
    <ThemeProvider theme={love8Theme}>
      <Container maxWidth="md" sx={{ py: 2 }}>
        {/* Header */}
        <Paper elevation={3} sx={{ p: 2, mb: 2, borderRadius: 3, background: 'linear-gradient(135deg, #FCE4EC, #F8BBD0)' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6" fontWeight="bold" color="#E91E63">
                <FavoriteIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Love8 五子棋 · 双人对战
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {getPlayerLabel()} · 房间 {roomId}
              </Typography>
            </Box>
            <Chip
              label={getGameStatus()}
              color={gameEnded ? (winner === myPlayerNum ? 'success' : winner === 0 ? 'default' : 'error') : 'primary'}
            />
          </Stack>
          {!isConnected && (
            <LinearProgress color="error" sx={{ mt: 1 }} />
          )}
        </Paper>

        {/* Game Result */}
        {gameEnded && (
          <Alert
            severity={winner === myPlayerNum ? 'success' : winner === 0 ? 'info' : 'error'}
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={handleRestart}>
                再来一局
              </Button>
            }
          >
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
            style={{
              cursor: gameEnded || currentPlayer !== myPlayerNum ? 'default' : 'pointer',
              maxWidth: '100%',
              height: 'auto',
            }}
          />
        </Paper>

        {/* Controls */}
        <Stack direction="row" spacing={2} justifyContent="center" mt={2}>
          <Button variant="outlined" startIcon={<RestartAltIcon />} onClick={handleRestart} disabled={!isConnected}>
            重新开始
          </Button>
          <Button variant="text" onClick={() => navigate('/')}>
            返回大厅
          </Button>
        </Stack>
      </Container>
    </ThemeProvider>
  );
}

export default GameBoard;
