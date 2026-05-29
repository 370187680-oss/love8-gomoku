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
    // Initialize socket connection
    const socket = io(serverUrl || '', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
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

    socketRef.current.once(SOCKET_EVENTS.ROOM_CREATED, (data) => {
      if (callback) callback(data);
    });
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

    // Listen for game started (room full)
    socketRef.current.once(SOCKET_EVENTS.GAME_STARTED, (data) => {
      if (callback) callback(null, data);
    });

    // Listen for errors
    socketRef.current.once('error', (error) => {
      if (callback) callback(error);
    });
  }, []);

  /**
   * Place a stone on the board
   * @param {number} row - Row index
   * @param {number} col - Column index
   * @param {string} roomId - Room ID
   */
  const placeStone = useCallback((row, col, roomId) => {
    if (!socketRef.current) return;
    
    socketRef.current.emit(SOCKET_EVENTS.PLACE_STONE, {
      roomId,
      row,
      col,
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
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  const on = useCallback((event, handler) => {
    if (!socketRef.current) return;
    socketRef.current.on(event, handler);
  }, []);

  /**
   * Unregister event listener
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  const off = useCallback((event, handler) => {
    if (!socketRef.current) return;
    socketRef.current.off(event, handler);
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
