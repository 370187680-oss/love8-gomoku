import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_EVENTS } from '../constants';

/**
 * Custom hook for Socket.io communication
 * @param {string} serverUrl - Server URL (optional, defaults to auto-detect)
 * @returns {Object} - Socket instance and helper functions
 */
export function useSocket(serverUrl) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Read saved room data for reconnection
    const savedRoomId = localStorage.getItem('gomoku_roomId');
    const savedPlayerName = localStorage.getItem('gomoku_playerName');

    // Initialize socket connection with reconnection data
    const socket = io(serverUrl || '', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      query: savedRoomId && savedPlayerName ? {
        roomId: savedRoomId,
        playerName: savedPlayerName,
      } : undefined,
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket disconnected');
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [serverUrl]);

  /**
   * Create a new room
   * @param {string} playerName - Host player name
   * @param {Function} callback - Callback with room data
   */
  const createRoom = useCallback((playerName, callback) => {
    if (!socketRef.current) return;

    socketRef.current.emit(SOCKET_EVENTS.CREATE_ROOM, {
      playerName,
    });

    if (callback) {
      socketRef.current.once(SOCKET_EVENTS.ROOM_CREATED, (data) => {
        callback(null, data);
      });
      socketRef.current.once(SOCKET_EVENTS.ROOM_ERROR, (data) => {
        callback(data, null);
      });
    }
  }, []);

  /**
   * Join an existing room
   * @param {string} roomId - Room ID to join
   * @param {string} playerName - Player name
   * @param {Function} callback - Callback with room data or error
   */
  const joinRoom = useCallback((roomId, playerName, callback) => {
    if (!socketRef.current) return;

    socketRef.current.emit(SOCKET_EVENTS.JOIN_ROOM, {
      roomId,
      playerName,
    });

    if (callback) {
      // Listen for game started (room full)
      socketRef.current.once(SOCKET_EVENTS.GAME_STARTED, (data) => {
        callback(null, data);
      });

      // Listen for errors (NOTE: do NOT use 'error' — it's a reserved event in Socket.io)
      socketRef.current.once(SOCKET_EVENTS.ROOM_ERROR, (data) => {
        callback(data, null);
      });
    }
  }, []);

  /**
   * Place a stone on the board
   * @param {number} row - Row index
   * @param {number} col - Column index
   * @param {string} roomId - Room ID
   */
  const placeStone = useCallback((row, col, roomId, playerNum) => {
    if (!socketRef.current) return;

    socketRef.current.emit(SOCKET_EVENTS.PLACE_STONE, {
      roomId,
      row,
      col,
      playerNum, // Tell server which player is placing
    });
  }, []);

  /**
   * Request game restart
   * @param {string} roomId - Room ID
   */
  const requestRestart = useCallback((roomId) => {
    if (!socketRef.current) return;

    socketRef.current.emit(SOCKET_EVENTS.RESTART_REQUEST, {
      roomId,
    });
  }, []);

  /**
   * Register event listener
   * @param {string} event - Event name (use SOCKET_EVENTS constants)
   * @param {Function} handler - Event handler
   */
  const on = useCallback((event, handler) => {
    if (!socketRef.current) return;
    // Support both raw event names and SOCKET_EVENTS constants
    const eventName = typeof event === 'string' ? event : event;
    socketRef.current.on(eventName, handler);
  }, []);

  /**
   * Unregister event listener
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  const off = useCallback((event, handler) => {
    if (!socketRef.current) return;
    const eventName = typeof event === 'string' ? event : event;
    socketRef.current.off(eventName, handler);
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    createRoom,
    joinRoom,
    placeStone,
    requestRestart,
    on,
    off,
  };
}
