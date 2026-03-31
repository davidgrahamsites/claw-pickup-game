import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function createWindow() {
  const window = new BrowserWindow({
    width: 1460,
    height: 960,
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: '#09050d',
    title: 'Claw Pickup Classroom',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    void window.loadURL(process.env.VITE_DEV_SERVER_URL)
    window.webContents.openDevTools({ mode: 'detach' })
  } else {
    void window.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('claw:save-file', async (_event, defaultName: string, data: string) => {
  const result = await dialog.showSaveDialog({
    title: 'Save classroom machine',
    defaultPath: path.join(app.getPath('documents'), defaultName),
    filters: [
      { name: 'Claw machine files', extensions: ['claw.json', 'json'] },
      { name: 'JSON files', extensions: ['json'] },
    ],
  })

  if (result.canceled || !result.filePath) {
    return { canceled: true }
  }

  await writeFile(result.filePath, data, 'utf8')
  return { canceled: false, path: result.filePath }
})

ipcMain.handle('claw:load-file', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Load classroom machine',
    properties: ['openFile'],
    filters: [
      { name: 'Claw machine files', extensions: ['claw.json', 'json'] },
      { name: 'JSON files', extensions: ['json'] },
    ],
  })

  const filePath = result.filePaths[0]
  if (result.canceled || !filePath) {
    return { canceled: true }
  }

  const data = await readFile(filePath, 'utf8')
  return { canceled: false, data, path: filePath }
})
