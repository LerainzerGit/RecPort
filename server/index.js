import express from 'express'
import http from 'http'
import path from 'path'
import { spawn, spawnSync } from 'child_process'
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { OpenRecServer } from '../lib/openrec.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()
const publicFolder = path.join(__dirname, '../client')

const port = Number(process.env.PORT || 3000)
const buildRoot = process.env.RECROOM_BUILD_DIR
  ? path.resolve(process.env.RECROOM_BUILD_DIR)
  : path.resolve(__dirname, '../recroom_build_20190611')
const launcherName = 'Recroom_Release.exe'
const launcherPath = path.join(buildRoot, launcherName)
const buildExists = existsSync(buildRoot)
const launcherAvailable = buildExists && existsSync(launcherPath)

app.use(express.static(publicFolder))
app.get('/', (req, res) => res.sendFile(path.join(publicFolder, 'index.html')))
app.get('/real', (req, res) => res.sendFile(path.join(publicFolder, 'real.html')))

if (buildExists) {
  app.use('/build', express.static(buildRoot))
}

app.get('/api/build-info', (req, res) => {
  res.json({
    buildRoot,
    buildExists,
    launcherPath,
    launcherAvailable,
    backendHttp: `http://localhost:${port}`,
    backendWs: `ws://localhost:${port}/screen`
  })
})

app.post('/api/build/launch', (req, res) => {
  if (!launcherAvailable) {
    return res.status(404).json({
      success: false,
      error: 'The Rec Room build directory or launcher executable was not found.'
    })
  }

  const options = {
    cwd: buildRoot,
    detached: true,
    stdio: 'ignore',
    env: { ...process.env }
  }
  let command = launcherPath
  let args = []

  if (process.platform !== 'win32') {
    const wineCheck = spawnSync('which', ['wine'], { encoding: 'utf8' })
    const xvfbCheck = spawnSync('which', ['xvfb-run'], { encoding: 'utf8' })
    if (wineCheck.status !== 0) {
      return res.status(500).json({
        success: false,
        error: 'No Wine runtime was found on this host, so the Windows build cannot be launched here.'
      })
    }

    if (xvfbCheck.status === 0) {
      command = 'xvfb-run'
      args = ['-a', 'wine', launcherPath]
    } else {
      command = 'wine'
      args = [launcherPath]
    }
  }

  try {
    const child = spawn(command, args, options)
    child.unref()
    res.json({
      success: true,
      pid: child.pid,
      command: [command, ...args].join(' '),
      note: 'Launch requested. The build is being started in the background.'
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

const server = http.createServer(app)

const recServer = new OpenRecServer({ screenMode: true })
recServer.attachHttpServer(server)

server.listen(port, () => {
  console.log(`RecPort backend running in screen mode on http://localhost:${port}`)
  console.log(`Build assets served from ${buildRoot}`)
  console.log('WebSocket path: ws://localhost:' + port + '/screen')
})
