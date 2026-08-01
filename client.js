import { RecClient } from './rec.js'
import { RecPacketType, buildAuthResponsePacket } from './protocol.js'

const logEl = document.getElementById('console')
const viewport = document.getElementById('viewport')
const connectBtn = document.getElementById('connectBtn')
const refreshBtn = document.getElementById('refreshBtn')
const moveBtn = document.getElementById('moveBtn')

let client = null
let currentWorld = null
let session = null

function log(message) {
  const line = document.createElement('div')
  line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`
  logEl.appendChild(line)
  logEl.scrollTop = logEl.scrollHeight
}

function connect() {
  if (client && client.isOpen()) {
    return
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const target = `${protocol}//${window.location.host}/screen`
  client = new RecClient(target)

  client.on('open', () => {
    log('Connected to RecPort backend.')
    connectBtn.disabled = true
  })

  client.on(RecPacketType.HANDSHAKE, (payload) => {
    log(`HANDSHAKE received: ${payload.protocol} ${payload.version} ${payload.serverName}`)
  })

  client.on(RecPacketType.AUTH_REQUEST, (payload) => {
    log(`AUTH_REQUEST received: ${payload.reason}`)
    client.sendPacket(buildAuthResponsePacket('RecBrowser'))
  })

  client.on(RecPacketType.SESSION_START, (payload) => {
    session = payload
    currentWorld = session.worldState
    log(`Session ${session.sessionId} started (${session.screenMode ? 'screen' : 'proxy'} mode).`)
    renderScene(currentWorld)
    refreshBtn.disabled = false
    moveBtn.disabled = false
  })

  client.on(RecPacketType.WORLD_STATE, (payload) => {
    currentWorld = payload.worldState
    renderScene(currentWorld)
  })

  client.on(RecPacketType.ENTITY_SPAWN, (payload) => {
    if (!currentWorld || !payload?.entity) return
    currentWorld.entities = currentWorld.entities || []
    currentWorld.entities.push(payload.entity)
    renderScene(currentWorld)
  })

  client.on(RecPacketType.ENTITY_UPDATE, (payload) => {
    if (!currentWorld) return
    payload.updates.forEach((update) => {
      const existing = currentWorld.entities.find((entity) => entity.id === update.id)
      if (existing) {
        Object.assign(existing, update)
      } else {
        currentWorld.entities.push(update)
      }
    })
    renderScene(currentWorld)
  })

  client.on(RecPacketType.STATUS, (payload) => {
    log(`STATUS: [${payload.status}] ${payload.message}`)
  })

  client.on(RecPacketType.ERROR, (payload) => {
    log(`ERROR: ${payload.message}`)
  })

  client.on('close', () => {
    log('Connection closed.')
    connectBtn.disabled = false
    refreshBtn.disabled = true
    moveBtn.disabled = true
  })

  client.on('error', (error) => {
    log(`WebSocket error: ${error?.message || error}`)
  })

  client.connect()
}

function renderScene(scene) {
  viewport.innerHTML = ''
  if (!scene) {
    return
  }

  const roomLabel = document.createElement('div')
  roomLabel.textContent = `${scene.roomName} · ${new Date(scene.timestamp).toLocaleTimeString()}`
  roomLabel.style.position = 'absolute'
  roomLabel.style.top = '12px'
  roomLabel.style.left = '12px'
  roomLabel.style.color = '#fff'
  roomLabel.style.fontSize = '12px'
  viewport.appendChild(roomLabel)

  if (Array.isArray(scene.entities)) {
    scene.entities.forEach((obj) => {
      const element = document.createElement('div')
      element.className = 'object'
      element.style.left = `${obj.x}px`
      element.style.top = `${obj.y}px`
      element.style.width = obj.type === 'terminal' ? '110px' : '56px'
      element.style.height = obj.type === 'terminal' ? '70px' : '56px'
      element.style.backgroundColor = obj.type === 'terminal' ? 'rgba(255,190,90,0.95)' : 'rgba(120,180,255,0.95)'
      element.textContent = obj.type
      viewport.appendChild(element)
    })
  }

  if (Array.isArray(scene.players)) {
    scene.players.forEach((player) => {
      const element = document.createElement('div')
      element.className = 'object'
      element.style.left = `${player.x}px`
      element.style.top = `${player.y}px`
      element.style.width = '56px'
      element.style.height = '56px'
      element.style.backgroundColor = player.color || 'rgba(180,255,150,0.95)'
      element.textContent = player.name
      viewport.appendChild(element)
    })
  }
}

function sendCommand(command) {
  if (!client || !client.isOpen()) {
    log('WebSocket is not connected.')
    return
  }
  client.sendPacket({ type: RecPacketType.COMMAND, payload: { command } })
}

function sendInput(input) {
  if (!client || !client.isOpen()) {
    log('WebSocket is not connected.')
    return
  }
  client.sendPacket({ type: RecPacketType.INPUT, payload: input })
}

connectBtn.addEventListener('click', connect)
refreshBtn.addEventListener('click', () => sendCommand('refresh'))
moveBtn.addEventListener('click', () => sendInput({ action: 'move', dx: 22, dy: 14 }))

log('Ready. Click Connect to begin.')
