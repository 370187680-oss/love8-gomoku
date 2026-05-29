// Board configuration
export const BOARD_SIZE = 15;

// Player constants
export const PLAYER_BLACK = 1; // 黑棋（房主先手）
export const PLAYER_WHITE = 2; // 白棋（加入者后手）

// Socket event names (snake_case protocol)
export const SOCKET_EVENTS = {
  // Client to server
  CREATE_ROOM: 'create_room',
  JOIN_ROOM: 'join_room',
  PLACE_STONE: 'place_stone',
  RESTART_REQUEST: 'restart_request',
  
  // Server to client
  ROOM_CREATED: 'room_created',
  GAME_STARTED: 'game_started',
  STONE_PLACED: 'stone_placed',
  GAME_OVER: 'game_over',
  GAME_RESTARTED: 'game_restarted',
  OPPONENT_DISCONNECTED: 'opponent_disconnected',
};

// Game status
export const GAME_STATUS = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  ENDED: 'ended',
};
