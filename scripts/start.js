#!/usr/bin/env node
// Lightweight wrapper to start Vite. We selectively filter the specific
// deprecation message about the CJS Node API so the terminal output is cleaner.
// We intentionally only suppress that exact message to avoid hiding real warnings.

(async () => {
  const origWarn = console.warn
  console.warn = function (...args) {
    try {
      const msg = String(args[0] || '')
      // Filter the Vite CJS deprecation single-line fragment
      if (msg.includes('The CJS build of Vite\'s Node API is deprecated')) {
        return
      }
    } catch (e) {
      // ignore
    }
    origWarn.apply(console, args)
  }

  try {
  const { createServer } = await import('vite')
  // Force a fixed port so the URL is stable for opening in the browser
  const server = await createServer({ server: { port: 5173 } })
    await server.listen()
    server.printUrls()

    // Try to open the app in the default browser once the server is listening.
    try {
      const httpServer = server.httpServer
      const port = httpServer && httpServer.address && typeof httpServer.address === 'function' && httpServer.address() ? httpServer.address().port : (server.config && server.config.server && server.config.server.port) || 5173
      const url = `http://localhost:${port}/`
      if (!process.env.CI) {
        const { spawn } = await import('child_process')
        if (process.platform === 'win32') {
          // Windows: use start via cmd
          spawn('cmd', ['/c', 'start', url], { detached: true, stdio: 'ignore' })
        } else if (process.platform === 'darwin') {
          spawn('open', [url], { detached: true, stdio: 'ignore' })
        } else {
          spawn('xdg-open', [url], { detached: true, stdio: 'ignore' })
        }
      }
    } catch (openErr) {
      // non-fatal: opening the browser failed
      // keep behavior silent so it doesn't interrupt the dev flow
    }
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
  // keep console.warn patched for the life of the process
})()
