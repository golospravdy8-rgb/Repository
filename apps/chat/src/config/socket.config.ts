// Socket.IO Configuration

export const SOCKET_CONFIG = {
  // Server settings
  server: {
    port: 3011,
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    // Performance tuning
    maxHttpBufferSize: 1e5, // 100KB
    pingInterval: 25000, // 25 seconds
    pingTimeout: 60000, // 60 seconds
  },

  // Game settings
  game: {
    updateInterval: 50, // ms - send state every 50ms (20 updates per second)
    physicsEnabled: true,
    gravity: 9.8, // pixels/second²
    ballMaxY: 600, // Reset ball if it goes below this
    ballDrag: 0.99, // Friction coefficient
  },

  // Room settings
  room: {
    maxPlayersPerRoom: 10,
    defaultRoomId: 'game-room-123',
    autoCleanupEmptyRooms: true,
    roomCleanupDelay: 1000, // ms
  },

  // Performance
  performance: {
    logConnections: true,
    logRoomUpdates: false,
    debugMode: true,
  },

  // Client settings (sent to client during connection)
  client: {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  },
};

export const GAME_CONSTANTS = {
  // Canvas/Game area
  COURT_WIDTH: 800,
  COURT_HEIGHT: 600,
  COURT_PADDING: 50,

  // Player
  PLAYER_RADIUS: 10,
  PLAYER_SPEED: 200, // pixels/second
  PLAYER_ACCELERATION: 500,

  // Ball
  BALL_RADIUS: 8,
  BALL_INITIAL_SPEED: 300,
  BALL_MAX_SPEED: 500,

  // Basket
  BASKET_TOP_Y: 80,
  BASKET_BOTTOM_Y: 520,
  BASKET_X: 400,
  BASKET_RADIUS: 15,
  BASKET_SCORE: 100,

  // Physics
  GRAVITY: 9.8,
  FRICTION: 0.99,
  BOUNCE_COEFFICIENT: 0.7,

  // Game states
  PLAYER_STATES: {
    ALIVE: 'alive',
    ELIMINATED: 'eliminated',
  },

  BALL_STATES: {
    IDLE: 'idle',
    FLYING: 'flying',
    IN_BASKET: 'in_basket',
  },
};

export const EVENTS = {
  // Client -> Server
  CLIENT: {
    JOIN_GAME: 'join_game',
    PLAYER_MOVE: 'player_move',
    SHOOT_START: 'shoot_start',
    BALL_STATE: 'ball_state',
    PLAYER_ELIMINATED: 'player_eliminated',
    SCORE_UPDATED: 'score_updated',
    DEBUG_ROOMS: 'debug_rooms',
  },

  // Server -> Client
  SERVER: {
    GAME_STATE_UPDATE: 'game_state_update',
    PLAYER_MOVED: 'player_moved',
    SHOOT_STARTED: 'shoot_started',
    BALL_UPDATED: 'ball_updated',
    PLAYER_WAS_ELIMINATED: 'player_was_eliminated',
    SCORE_CHANGED: 'score_changed',
    PLAYER_JOINED: 'player_joined',
    PLAYER_DISCONNECTED: 'player_disconnected',
    DEBUG_ROOMS_INFO: 'debug_rooms_info',
  },
};

export type SocketConfig = typeof SOCKET_CONFIG;
export type GameConstants = typeof GAME_CONSTANTS;
export type Events = typeof EVENTS;
