export const RecPacketType = {
  HANDSHAKE: 'handshake',
  AUTH_REQUEST: 'auth_request',
  AUTH_RESPONSE: 'auth_response',
  SESSION_START: 'session_start',
  WORLD_STATE: 'world_state',
  ENTITY_SPAWN: 'entity_spawn',
  ENTITY_UPDATE: 'entity_update',
  CHAT: 'chat',
  INPUT: 'input',
  COMMAND: 'command',
  PING: 'ping',
  PONG: 'pong',
  STATUS: 'status',
  ERROR: 'error'
}

export function createPacket(type, payload = {}) {
  return { type, payload }
}

export function parsePacket(raw) {
  try {
    const packet = JSON.parse(raw)
    if (!packet || typeof packet.type !== 'string') {
      return null
    }
    return packet
  } catch {
    return null
  }
}

export function serializePacket(packet) {
  return JSON.stringify(packet)
}

export function buildHandshakePacket() {
  return createPacket(RecPacketType.HANDSHAKE, {
    protocol: 'RecRoom-2019',
    version: '2019.07',
    build: '9.0.112',
    screenMode: true,
    serverName: 'RecPort'
  })
}

export function buildAuthResponsePacket(displayName) {
  return createPacket(RecPacketType.AUTH_RESPONSE, {
    displayName,
    timestamp: Date.now()
  })
}

export function buildSessionPacket(sessionId, worldState, players = []) {
  return createPacket(RecPacketType.SESSION_START, {
    sessionId,
    worldState,
    players,
    screenMode: true,
    timestamp: Date.now()
  })
}

export function buildEntitySpawnPacket(entity) {
  return createPacket(RecPacketType.ENTITY_SPAWN, {
    entity,
    timestamp: Date.now()
  })
}

export function buildWorldStatePacket(worldState) {
  return createPacket(RecPacketType.WORLD_STATE, {
    worldState,
    timestamp: Date.now()
  })
}

export function buildEntityUpdatePacket(updates) {
  return createPacket(RecPacketType.ENTITY_UPDATE, {
    updates,
    timestamp: Date.now()
  })
}

export function buildStatusPacket(status, message) {
  return createPacket(RecPacketType.STATUS, {
    status,
    message,
    timestamp: Date.now()
  })
}

export function buildErrorPacket(message) {
  return createPacket(RecPacketType.ERROR, {
    message,
    timestamp: Date.now()
  })
}
