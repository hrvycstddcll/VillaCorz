import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const backendProxy = {
  '/api': 'http://127.0.0.1:8000',
  '/sanctum': 'http://127.0.0.1:8000',
}

const tunnelAuth = (password: string): Plugin => ({
  name: 'villacorz-tunnel-auth',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const header = req.headers.authorization
      const supplied = header?.startsWith('Basic ')
        ? Buffer.from(header.slice(6), 'base64').toString()
        : ''
      const secret = supplied.split(':', 2)[1]

      if (secret === password) {
        next()
        return
      }

      res.setHeader('WWW-Authenticate', 'Basic realm="VillaCorz", charset="UTF-8"')
      res.statusCode = 401
      res.end('Unauthorized')
    })
  },
})

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isTunnel = mode === 'tunnel'
  const password = env.TUNNEL_PASSWORD?.trim()

  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
      ...(isTunnel && password ? [tunnelAuth(password)] : []),
    ],
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    server: {
      host: true,
      port: 5173,
      allowedHosts: isTunnel ? ['.trycloudflare.com'] : [],
      proxy: isTunnel ? backendProxy : undefined,
    },
  }
})
