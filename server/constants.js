// Socket event names (CommonJS for server)
// Must match client/src/constants.js SOCKET_EVENTS values
module.exports = {
  CREATE_ROOM: 'create_room',
  JOIN_ROOM: 'join_room',
  PLACE_STONE: 'place_stone',
  RESTART_REQUEST: 'restart_request',

  ROOM_CREATED: 'room_created',
  GAME_STARTED: 'game_started',
  STONE_PLACED: 'stone_placed',
  GAME_OVER: 'game_over',
  GAME_RESTARTED: 'game_restarted',
  OPPONENT_DISCONNECTED: 'opponent_disconnected',
  ROOM_ERROR: 'room_error',
};
