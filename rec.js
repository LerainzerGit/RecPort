import { serializePacket, parsePacket } from './protocol.js'

export class RecClient {
  constructor(url) {
    this.url = url
    this.socket = null
    this.handlers = {}
  }

  connect() {
    return new Promise((resolve, reject) => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        resolve()
        return
      }

      this.socket = new WebSocket(this.url)
      this.socket.addEventListener('open', () => {
        this.trigger('open')
        resolve()
      })
      this.socket.addEventListener('message', (event) => {
        const packet = parsePacket(event.data)
        if (!packet) {
          this.trigger('error', new Error('Failed to parse packet'))
          return
        }
        this.trigger(packet.type, packet.payload)
      })
      this.socket.addEventListener('close', () => this.trigger('close'))
      this.socket.addEventListener('error', (error) => this.trigger('error', error))
    })
  }

  isOpen() {
    return this.socket && this.socket.readyState === WebSocket.OPEN
  }

  sendPacket(packet) {
    if (!this.isOpen()) {
      throw new Error('RecClient is not connected')
    }
    this.socket.send(serializePacket(packet))
  }

  on(type, callback) {
    this.handlers[type] = callback
  }

  trigger(type, payload) {
    if (typeof this.handlers[type] === 'function') {
      this.handlers[type](payload)
    }
  }
}
