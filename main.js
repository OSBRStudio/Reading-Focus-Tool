const { app, BrowserWindow, globalShortcut, ipcMain, screen, nativeTheme } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow
let settings = {
  opacity: 0.5,
  isBlack: true,
  lineHeight: 60,
  showFooter: false,
  showDashedLines: true
}

// File to save settings
const settingsPath = path.join(app.getPath('userData'), 'settings.json')

// Load saved settings
function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8')
      const savedSettings = JSON.parse(data)
      settings = { ...settings, ...savedSettings }
      console.log('Loaded settings:', settings)
      return true
    }
  } catch (error) {
    console.log('No saved settings found, using defaults')
  }
  return false
}

// Save settings
function saveSettings() {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
    console.log('Settings saved:', settings)
    return true
  } catch (error) {
    console.log('Error saving settings:', error)
    return false
  }
}

function createWindow() {
  loadSettings()
  
  // Get screen size for full screen
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  // Create transparent window
  mainWindow = new BrowserWindow({
    x: 0,
    y: 0,
    width: width,
    height: height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: false,
    fullscreen: false,
    focusable: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  // Load the HTML file
  mainWindow.loadFile('index.html')
  
  // Make window stay on top
  mainWindow.setAlwaysOnTop(true, 'screen-saver')
  mainWindow.focus()
  
  // Enable click-through from the start
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      console.log('Enabling click-through on startup')
      mainWindow.setIgnoreMouseEvents(true, { forward: true })
    }
  }, 500)
  
  // Send settings to the window
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Sending settings to renderer')
    
    // Send current system theme color
    const systemTheme = {
      shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
      themeSource: nativeTheme.themeSource
    }
    
    mainWindow.webContents.send('load-settings', {
      ...settings,
      systemTheme: systemTheme
    })
  })
  
  // For development: open DevTools (comment out when building)
  // mainWindow.webContents.openDevTools()
  
  // Handle window events
  mainWindow.on('blur', () => {
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setAlwaysOnTop(true, 'screen-saver')
        mainWindow.focus()
      }
    }, 50)
  })
  
  mainWindow.on('close', () => {
    console.log('Window closing, saving settings...')
    saveSettings()
  })
  
  mainWindow.on('focus', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setAlwaysOnTop(true, 'screen-saver')
    }
  })
  
  // Window show event
  mainWindow.on('show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setAlwaysOnTop(true, 'screen-saver')
      mainWindow.focus()
    }
  })
  
  // Listen for system theme changes
  nativeTheme.on('updated', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const systemTheme = {
        shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
        themeSource: nativeTheme.themeSource
      }
      mainWindow.webContents.send('system-theme-changed', systemTheme)
    }
  })
}

// Register global keyboard shortcuts
function registerShortcuts() {
  // First unregister all shortcuts
  globalShortcut.unregisterAll()
  
  console.log('Registering global shortcuts...')
  
  // Ctrl+Alt+Up: Increase opacity
  globalShortcut.register('Ctrl+Alt+Up', () => {
    console.log('Ctrl+Alt+Up: Increase opacity')
    const newOpacity = Math.min(1, Math.round((settings.opacity + 0.05) * 100) / 100)
    settings.opacity = newOpacity
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('adjust-opacity', settings.opacity)
    }
    saveSettings()
  })
  
  // Ctrl+Alt+Down: Decrease opacity
  globalShortcut.register('Ctrl+Alt+Down', () => {
    console.log('Ctrl+Alt+Down: Decrease opacity')
    const newOpacity = Math.max(0.05, Math.round((settings.opacity - 0.05) * 100) / 100)
    settings.opacity = newOpacity
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('adjust-opacity', settings.opacity)
    }
    saveSettings()
  })
  
  // Ctrl+Alt+B: Toggle black/white
  globalShortcut.register('Ctrl+Alt+B', () => {
    console.log('Ctrl+Alt+B: Toggle color')
    settings.isBlack = !settings.isBlack
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('toggle-color', settings.isBlack)
    }
    saveSettings()
  })
  
  // Ctrl+Alt+=: Increase reading window height
  globalShortcut.register('Ctrl+Alt+=', () => {
    console.log('Ctrl+Alt+=: Increase reading window height')
    const newHeight = Math.min(300, settings.lineHeight + 5)
    settings.lineHeight = newHeight
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('adjust-line-height', settings.lineHeight)
    }
    saveSettings()
  })
  
  // Ctrl+Alt+-: Decrease reading window height
  globalShortcut.register('Ctrl+Alt+-', () => {
    console.log('Ctrl+Alt+-: Decrease reading window height')
    const newHeight = Math.max(20, settings.lineHeight - 5)
    settings.lineHeight = newHeight
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('adjust-line-height', settings.lineHeight)
    }
    saveSettings()
  })
  
  // Ctrl+Alt+L: Toggle dashed lines
  globalShortcut.register('Ctrl+Alt+L', () => {
    console.log('Ctrl+Alt+L: Toggle dashed lines')
    settings.showDashedLines = !settings.showDashedLines
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('toggle-dashed-lines', settings.showDashedLines)
    }
    
    saveSettings()
  })
  
  // Ctrl+Alt+Q: Quit application
  globalShortcut.register('Ctrl+Alt+Q', () => {
    console.log('Ctrl+Alt+Q: Quit application')
    app.quit()
  })
  
  console.log('Shortcut registration complete')
}

// Keep window always on top
function keepWindowOnTop() {
  if (!mainWindow) return
  
  // Set window to always stay on top
  mainWindow.setAlwaysOnTop(true, 'screen-saver')
  
  // Regular check
  const checkInterval = setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setAlwaysOnTop(true, 'screen-saver')
      mainWindow.webContents.send('force-always-on-top')
    } else {
      clearInterval(checkInterval)
    }
  }, 5000)
}

// When app is ready
app.whenReady().then(() => {
  console.log('App is ready, creating window...')
  createWindow()
  registerShortcuts()
  keepWindowOnTop()
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
      keepWindowOnTop()
    }
  })
})

// Quit when all windows are closed
app.on('window-all-closed', () => {
  console.log('All windows closed, quitting...')
  if (process.platform !== 'darwin') app.quit()
})

// Clean up shortcuts
app.on('will-quit', () => {
  console.log('App will quit, cleaning up...')
  globalShortcut.unregisterAll()
  saveSettings()
})

// Listen for settings updates
ipcMain.on('update-settings', (event, newSettings) => {
  console.log('Renderer updated settings:', newSettings)
  settings = { ...settings, ...newSettings }
  saveSettings()
})

// Handle mouse events for click-through
ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win && !win.isDestroyed()) {
    try {
      if (ignore) {
        win.setIgnoreMouseEvents(true, options || { forward: true })
      } else {
        win.setIgnoreMouseEvents(false)
      }
    } catch (error) {
      console.error('Error setting ignore mouse events:', error)
    }
  }
})

// Handle window controls
ipcMain.on('window-control', (event, action) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win || win.isDestroyed()) return
  
  switch(action) {
    case 'minimize':
      win.minimize()
      break
    case 'close':
      win.close()
      break
  }
})

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
})

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  console.log('Another instance is running, quitting...')
  app.quit()
} else {
  app.on('second-instance', () => {
    console.log('Second instance attempted, focusing existing window')
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
      mainWindow.setAlwaysOnTop(true, 'screen-saver')
    }
  })
}