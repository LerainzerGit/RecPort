import { WebSocketServer } from 'ws'
import {
  RecPacketType,
  parsePacket,
  serializePacket,
  buildHandshakePacket,
  buildAuthRequestPacket,
  buildSessionPacket,
  buildWorldStatePacket,
  buildEntitySpawnPacket,
  buildEntityUpdatePacket,
  buildStatusPacket,
  buildErrorPacket
} from './protocol.js'

const DEFAULT_FRAME_RATE = 66

export class OpenRecServer {
  constructor(options = {}) {
    this.screenMode = options.screenMode === true
    this.clients = new Set()
    this.server = null
    this.frameCount = 0
    this.sessionId = `session-${Math.random().toString(36).slice(2, 9)}`
    this.worldState = {
      roomName: 'RecPort 2019 Demo Room',
      timestamp: Date.now(),
      players: [
        { id: 'host', name: 'RecPortHost', x: 320, y: 180, color: '#7fbfff', health: 100 }
      ],
      entities: [
        { id: 'marker', type: 'marker', x: 190, y: 140, state: 'idle' },
        { id: 'terminal', type: 'terminal', x: 320, y: 260, state: 'ready' }
      ]
    }
  }

  attachHttpServer(httpServer) {
    this.server = new WebSocketServer({ server: httpServer, path: '/screen' })

    this.server.on('connection', (socket) => {
      socket.clientId = `client-${Math.random().toString(36).slice(2, 10)}`
      socket.authenticated = false
      this.clients.add(socket)

      this.sendPacket(socket, buildHandshakePacket())
      this.sendPacket(socket, buildAuthRequestPacket())

      socket.on('message', (raw) => this.handleClientMessage(socket, raw))
      socket.on('close', () => this.clients.delete(socket))
      socket.on('error', () => this.clients.delete(socket))
    })

    this.startWorldUpdates()
  }

  startWorldUpdates() {
    setInterval(() => {
      this.frameCount += 1
      this.updateWorldState()
      this.broadcast(buildWorldStatePacket(this.worldState))
    }, DEFAULT_FRAME_RATE)
  }

  handleClientMessage(socket, raw) {
    const packet = parsePacket(raw.toString())
    if (!packet) {
      return this.sendPacket(socket, buildErrorPacket('Malformed packet received.'))
    }

    if (packet.type !== RecPacketType.AUTH_RESPONSE && packet.type !== RecPacketType.PING && !socket.authenticated) {
      return this.sendPacket(socket, buildErrorPacket('Authentication required before sending game input or commands.'))
    }

    switch (packet.type) {
      case RecPacketType.INPUT:
        this.applyInput(socket, packet.payload)
        break
      case RecPacketType.COMMAND:
        this.executeCommand(socket, packet.payload)
        break
      case RecPacketType.PING:
        this.sendPacket(socket, { type: RecPacketType.PONG, payload: { timestamp: Date.now() } })
        break
      case RecPacketType.AUTH_RESPONSE:
        this.handleAuthResponse(socket, packet.payload)
        break
      default:
        this.sendPacket(socket, buildErrorPacket(`Unsupported packet type: ${packet.type}`))
    }
  }

  handleAuthResponse(socket, payload) {
    if (socket.authenticated) {
      return this.sendPacket(socket, buildStatusPacket('info', 'Already authenticated.'))
    }

    const name = payload?.displayName || 'RecBrowser'
    const existing = this.worldState.players.find((player) => player.id === socket.clientId)
    if (!existing) {
      const player = { id: socket.clientId, name, x: 300, y: 200, color: '#c7ff8b', health: 100 }
      this.worldState.players.push(player)
      this.broadcast(buildEntitySpawnPacket(player))
    }

    socket.authenticated = true
    this.sendPacket(socket, buildStatusPacket('success', `Authenticated as ${name}`))
    this.sendPacket(socket, buildSessionPacket(this.sessionId, this.worldState, this.worldState.players))
    this.sendPacket(socket, buildWorldStatePacket(this.worldState))
  }

  applyInput(socket, payload) {
    if (!socket.authenticated) {
      return this.sendPacket(socket, buildErrorPacket('Cannot apply input before authentication.'))
    }

    if (!payload || typeof payload !== 'object') {
      return this.sendPacket(socket, buildErrorPacket('Invalid input payload'))
    }

    if (payload.action === 'move') {
      const player = this.worldState.players.find((p) => p.id === socket.clientId) || this.worldState.players[0]
      player.x = Math.max(20, Math.min(620, player.x + (payload.dx || 0)))
      player.y = Math.max(20, Math.min(320, player.y + (payload.dy || 0)))
      this.broadcast(buildEntityUpdatePacket([{ id: player.id, x: player.x, y: player.y, type: 'player' }]))
      return
    }

    if (payload.action === 'interact') {
      this.sendPacket(socket, buildStatusPacket('info', `Interaction requested with ${payload.target}`))
      return
    }

    this.sendPacket(socket, buildErrorPacket(`Unsupported input action: ${payload.action}`))
  }

  executeCommand(socket, payload) {
    if (!payload || typeof payload !== 'object') {
      return this.sendPacket(socket, buildErrorPacket('Invalid command payload'))
    }

    if (payload.command === 'refresh') {
      this.sendPacket(socket, buildSessionPacket(this.sessionId, this.worldState, this.worldState.players))
      return
    }

    this.sendPacket(socket, buildErrorPacket(`Unknown command: ${payload.command}`))
  }

  updateWorldState() {
    const pulse = Math.sin(this.frameCount * 0.08) * 6
    this.worldState.entities = this.worldState.entities.map((entity) => {
      if (entity.id === 'marker') {
        return { ...entity, x: 190 + pulse, y: 140 + Math.abs(pulse) }
      }
      return entity
    })
    this.worldState.timestamp = Date.now()
  }

  sendPacket(socket, packet) {
    if (socket.readyState !== socket.OPEN) {
      return
    }
    socket.send(serializePacket(packet))
  }

  broadcast(packet) {
    const encoded = serializePacket(packet)
    for (const client of this.clients) {
      if (client.readyState === client.OPEN) {
        client.send(encoded)
      }
    }
  }
}
