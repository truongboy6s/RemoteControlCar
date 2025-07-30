module.exports = {
  // User Roles
  ROLES: {
    ADMIN: 'admin',
    USER: 'user'
  },

  // Car Commands
  COMMANDS: {
    FORWARD: 'forward',
    BACKWARD: 'backward',
    LEFT: 'left',
    RIGHT: 'right',
    STOP: 'stop',
    AUTO: 'auto',
    AUTO_ON: 'auto_on',
    AUTO_OFF: 'auto_off',
    MANUAL: 'manual',
    MANUAL_ON: 'manual_on',
    MANUAL_OFF: 'manual_off'
  },

  // Log Actions
  LOG_ACTIONS: {
    // Authentication
    LOGIN: 'login',
    LOGOUT: 'logout',
    LOGIN_FAILED: 'login_failed',
    TOKEN_REFRESH: 'token_refresh',
    REGISTER: 'register',
    CHANGE_PASSWORD: 'change_password',
    
    // User Management
    CREATE_USER: 'user_created',
    UPDATE_USER: 'user_updated',
    DELETE_USER: 'user_deleted',
    PASSWORD_CHANGED: 'password_changed',
    ROLE_CHANGED: 'role_changed',
    
    // Car Commands (Movement)
    FORWARD: 'forward',
    BACKWARD: 'backward',
    LEFT: 'left',
    RIGHT: 'right',
    STOP: 'stop',
    AUTO: 'auto',
    AUTO_ON: 'auto_on',
    AUTO_OFF: 'auto_off',
    MANUAL: 'manual',
    MANUAL_ON: 'manual_on',
    MANUAL_OFF: 'manual_off',
    
    // System
    GRANT_ACCESS: 'grant_access',
    SEND_COMMAND: 'send_command',
    LOG_CLEANUP: 'log_cleanup',
    LOG_EXPORT: 'log_export'
  },

  // HTTP Status Codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_ERROR: 500
  },

  // JWT Expiration
  JWT_EXPIRES_IN: '24h',

  // Default Values
  DEFAULT_SPEED: 150,
  SENSOR_READ_INTERVAL: 1000 // milliseconds
};
