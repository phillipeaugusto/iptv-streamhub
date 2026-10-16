/**
 * Static SPA + reverse proxy for Xtream (API + HLS/VOD).
 * Browser talks only to this origin → avoids CORS / mixed content on Coolify HTTPS.
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = process.env.STATIC_ROOT || path.join(__dirname, 'publicar')
const PORT = Number(process.env.PORT || 80)
const PROXY_PREFIX = '/iptv-proxy/h/'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
}

function base64UrlDecode(input) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  return Buffer.from(padded + pad, 'base64').toString('utf8')
}

function base64UrlEncode(input) {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function isPrivateIp(ip) {
  if (ip === '::1' || ip === '0.0.0.0') return true
  if (ip.startsWith('127.') || ip.startsWith('10.') || ip.startsWith('192.168.')) return true
  if (ip.startsWith('169.254.')) return true
  const m = /^172\.(\d+)\./.exec(ip)
  if (m) {
    const n = Number(m[1])
    if (n >= 16 && n <= 31) return true
  }
  if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80')) return true
  return false
}

async function assertSafeTarget(targetUrl) {
  const u = new URL(targetUrl)
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('Protocolo não permitido.')
  }
  const host = u.hostname
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('Host local bloqueado.')
  }
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true })).map((a) => a.address)
  if (!addresses.length || addresses.some(isPrivateIp)) {
    throw new Error('Destino de rede privada bloqueado.')
  }
  return u
}

function toProxyPath(absoluteUrl) {
  const u = new URL(absoluteUrl)
  return `${PROXY_PREFIX}${base64UrlEncode(u.origin)}${u.pathname}${u.search}`
}

function rewritePlaylist(body, playlistUrl) {
  const base = new URL(playlistUrl)
  const rewriteRef = (ref) => {
    try {
      const absolute = new URL(ref, base).href
      return toProxyPath(absolute)
    } catch {
      return ref
    }
  }

  return body
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) return line
      if (trimmed.startsWith('#')) {
        return line.replace(/URI="([^"]+)"/gi, (_, uri) => `URI="${rewriteRef(uri)}"`)
      }
      return rewriteRef(trimmed)
    })
    .join('\n')
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers)
  res.end(body)
}

function contentTypeFor(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
}

function serveStatic(req, res) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  let pathname = decodeURIComponent(url.pathname)
  if (pathname === '/') pathname = '/index.html'

  const filePath = path.normalize(path.join(ROOT, pathname))
  if (!filePath.startsWith(ROOT)) {
    send(res, 403, 'Forbidden')
    return
  }

  fs.readFile(filePath, (err, data) => {
    if (!err) {
      const headers = {
        'Content-Type': contentTypeFor(filePath),
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      }
      if (pathname.startsWith('/assets/')) {
        headers['Cache-Control'] = 'public, max-age=31536000, immutable'
      }
      send(res, 200, data, headers)
      return
    }

    // SPA fallback (HashRouter still benefits from index for deep links)
    fs.readFile(path.join(ROOT, 'index.html'), (indexErr, indexData) => {
      if (indexErr) {
        send(res, 404, 'Not found')
        return
      }
      send(res, 200, indexData, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
      })
    })
  })
}

async function handleProxy(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, 'Method not allowed')
    return
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const rest = url.pathname.slice(PROXY_PREFIX.length)
  const slash = rest.indexOf('/')
  if (slash <= 0) {
    send(res, 400, 'Proxy path inválido')
    return
  }

  let origin
  try {
    origin = base64UrlDecode(rest.slice(0, slash))
  } catch {
    send(res, 400, 'Origin inválida')
    return
  }

  const targetPath = rest.slice(slash) + url.search
  let target
  try {
    target = await assertSafeTarget(origin + targetPath)
  } catch (error) {
    send(res, 403, error instanceof Error ? error.message : 'Destino bloqueado')
    return
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60000)
  req.on('close', () => controller.abort())

  try {
    const upstream = await fetch(target.href, {
      method: req.method,
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': req.headers['user-agent'] || 'StreamHub-IPTV-Proxy/1.0',
        Accept: req.headers.accept || '*/*',
      },
    })

    const contentType = upstream.headers.get('content-type') || ''
    const isPlaylist =
      /mpegurl|m3u8|application\/vnd\.apple\.mpegurl/i.test(contentType) ||
      target.pathname.toLowerCase().endsWith('.m3u8')

    const outHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': isPlaylist ? 'no-cache' : 'public, max-age=60',
    }

    if (isPlaylist && req.method === 'GET') {
      const text = await upstream.text()
      const rewritten = rewritePlaylist(text, target.href)
      outHeaders['Content-Type'] = 'application/vnd.apple.mpegurl; charset=utf-8'
      send(res, upstream.status, rewritten, outHeaders)
      return
    }

    if (contentType) outHeaders['Content-Type'] = contentType
    const len = upstream.headers.get('content-length')
    if (len) outHeaders['Content-Length'] = len

    res.writeHead(upstream.status, outHeaders)
    if (req.method === 'HEAD' || !upstream.body) {
      res.end()
      return
    }

    const reader = upstream.body.getReader()
    const pump = async () => {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        if (!res.write(Buffer.from(value))) {
          await new Promise((resolve) => res.once('drain', resolve))
        }
      }
      res.end()
    }
    await pump()
  } catch (error) {
    if (!res.headersSent) {
      const message = error instanceof Error ? error.message : 'Falha no proxy'
      send(res, 502, `Proxy error: ${message}`)
    } else {
      res.destroy()
    }
  } finally {
    clearTimeout(timeout)
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

  if (url.pathname === '/healthz') {
    send(res, 200, 'ok\n', { 'Content-Type': 'text/plain; charset=utf-8' })
    return
  }

  if (url.pathname.startsWith(PROXY_PREFIX)) {
    void handleProxy(req, res)
    return
  }

  serveStatic(req, res)
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`StreamHub listening on :${PORT} (static=${ROOT})`)
})
