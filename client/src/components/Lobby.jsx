import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { SOCKET_EVENTS } from '../constants';
import { ThemeProvider } from '@mui/material/styles';
import love8Theme from '../theme/love8Theme';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Stack,
  Alert,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';

function Lobby() {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  
  const { socket, isConnected, createRoom, joinRoom, on, off } = useSocket();

  // Listen for server errors
  React.useEffect(() => {
    const handleError = (data) => {
      console.error('Server error:', data);
      setError(data.message || '操作失败，请重试');
      setIsCreating(false);
      setIsJoining(false);
    };
    on(SOCKET_EVENTS.ROOM_ERROR, handleError);
    return () => { off(SOCKET_EVENTS.ROOM_ERROR, handleError); };
  }, [on, off]);

    // Listen for room creation success
  React.useEffect(() => {
    on(SOCKET_EVENTS.ROOM_CREATED, (data) => {
      console.log('Room created:', data);
      setIsCreating(false);
      // Save room data for reconnection
      localStorage.setItem('gomoku_roomId', data.roomId);
      localStorage.setItem('gomoku_playerName', playerName);
      // Navigate to game with room data (black goes first)
      navigate('/game', {
        state: {
          roomId: data.roomId,
          playerId: data.playerId,
          playerRole: 'black', // Host is black
          playerName: playerName,
          currentPlayer: 1, // Black goes first
        },
      });
    });

    return () => {
      off(SOCKET_EVENTS.ROOM_CREATED);
    };
  }, [on, off, navigate, playerName]);

  // Listen for game start (when joining room successfully)
  React.useEffect(() => {
    on(SOCKET_EVENTS.GAME_STARTED, (data) => {
      console.log('Game started:', data);
      setIsJoining(false);
      // Save room data for reconnection
      localStorage.setItem('gomoku_roomId', data.roomId);
      localStorage.setItem('gomoku_playerName', playerName);
      navigate('/game', {
        state: {
          roomId: data.roomId,
          playerId: data.playerId,
          playerRole: 'white', // Joiner is white
          playerName: playerName,
          currentPlayer: data.currentPlayer, // Pass currentPlayer to avoid missing the event
        },
      });
    });

    return () => {
      off(SOCKET_EVENTS.GAME_STARTED);
    };
  }, [on, off, navigate, playerName]);

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      setError('请输入你的名字');
      return;
    }
    
    setError('');
    setIsCreating(true);
    createRoom(playerName.trim());
  };

  const handleJoinRoom = () => {
    if (!playerName.trim()) {
      setError('请输入你的名字');
      return;
    }
    if (!roomId.trim()) {
      setError('请输入房间号');
      return;
    }
    
    setError('');
    setIsJoining(true);
    joinRoom(roomId.trim().toUpperCase(), playerName.trim());
  };

  return (
    <ThemeProvider theme={love8Theme}>
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #FCE4EC 0%, #F8BBD0 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Container maxWidth="sm">
          <Paper
            elevation={6}
            sx={{
              p: 4,
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
            }}
          >
            {/* Header */}
            <Stack spacing={2} alignItems="center" mb={4}>
              <FavoriteIcon sx={{ fontSize: 60, color: 'primary.main' }} />
              <Typography variant="h4" fontWeight="bold" color="primary">
                Love8 情侣五子棋
              </Typography>
              <Typography variant="body1" color="text.secondary">
                和心爱的人一起下棋吧 ❤️
              </Typography>
            </Stack>

            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            {/* Input Fields */}
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="你的名字"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="输入你的昵称"
                variant="outlined"
                disabled={isCreating || isJoining}
              />

              <TextField
                fullWidth
                label="房间号（加入时填写）"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="输入对方分享的房间号"
                variant="outlined"
                disabled={isCreating || isJoining}
              />

              {/* Action Buttons */}
              <Stack direction="row" spacing={2}>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={handleCreateRoom}
                  disabled={isCreating || isJoining}
                  startIcon={<FavoriteIcon />}
                  sx={{ py: 1.5 }}
                >
                  {isCreating ? '创建中...' : '创建房间'}
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  onClick={handleJoinRoom}
                  disabled={isCreating || isJoining}
                  sx={{ py: 1.5 }}
                >
                  {isJoining ? '加入中...' : '加入房间'}
                </Button>
              </Stack>
            </Stack>

            {/* Tips */}
            <Box mt={3} p={2} bgcolor="grey.50" borderRadius={2}>
              <Typography variant="body2" color="text.secondary">
                💡 提示：
                <br />
                1. 点击「创建房间」获得房间号
                <br />
                2. 分享房间号给对方
                <br />
                3. 对方输入房间号加入，即可开始游戏
              </Typography>
            </Box>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default Lobby;
