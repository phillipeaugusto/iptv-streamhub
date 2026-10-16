/**
 * Static SPA + reverse proxy for Xtream (API + HLS/VOD).
 * Browser talks only to this origin → avoids CORS / mixed content on Coolify HTTPS.
 */
import http from 'node:http'
import https from 'node:https'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resolver, lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = process.env.STATIC_ROOT || path.join(__dirname, 'publicar')
const PORT = Number(process.env.PORT || 80)
const PROXY_PREFIX = '/iptv-proxy/h/'

const publicDns = new Resolver()
publicDns.setServers(['1.1.1.1', '1.0.0.1', '8.8.8.8', '8.8.4.4'])

class ProxyError extends Error {
  constructor(message, status = 502) {
    super(message)
    this.status = status
  }
}

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

async function resolveAddresses(hostname) {
  if (isIP(hostname)) return [hostname]

  try {
    const system = await lookup(hostname, { all: true })
    const addresses = system.map((item) => item.address).filter(Boolean)
    if (addresses.length) return addresses
  } catch {
    // O DNS do container (Coolify/Docker) às vezes devolve ENOTFOUND
    // para um host que 1.1.1.1 e 8.8.8.8 resolvem.
  }

  const found = []
  await Promise.all(
    [publicDns.resolve4(hostname), publicDns.resolve6(hostname)].map(async (pending) => {
      try {
        found.push(...(await pending))
      } catch {
        // A outra família (A/AAAA) pode existir.
      }
    }),
  )

  if (!found.length) {
    const viaDoh = await resolveViaDoh(hostname)
    found.push(...viaDoh)
  }

  if (!found.length) {
    throw new ProxyError(`A VPS não conseguiu resolver o DNS de ${hostname}.`)
  }
  return found
}

function dohQuery(hostname, type) {
  const query = `/dns-query?name=${encodeURIComponent(hostname)}&type=${type}`
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: '1.1.1.1',
        servername: 'cloudflare-dns.com',
        path: query,
        method: 'GET',
        headers: {
          Host: 'cloudflare-dns.com',
          Accept: 'application/dns-json',
        },
      },
      (res) => {
        const chunks = []
        res.on('data', (chunk) => chunks.push(chunk))
        res.on('end', () => {
          try {
            const json = JSON.parse(Buffer.concat(chunks).toString('utf8'))
            const wanted = type === 'AAAA' ? 28 : 1
            const answers = Array.isArray(json.Answer) ? json.Answer : []
            resolve(
              answers
                .filter((item) => item.type === wanted && typeof item.data === 'string')
                .map((item) => item.data),
            )
          } catch (error) {
            reject(error)
          }
        })
      },
    )
    req.setTimeout(8000, () => req.destroy(new Error('Timeout no DNS público.')))
    req.on('error', reject)
    req.end()
  })
}

async function resolveViaDoh(hostname) {
  const found = []
  for (const type of ['A', 'AAAA']) {
    try {
      found.push(...(await dohQuery(hostname, type)))
    } catch {
      // Porta 53 pode estar fechada; DoH na 443 é o último recurso.
    }
  }
  return found
}

async function assertSafeTarget(targetUrl) {
  const u = new URL(targetUrl)
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new ProxyError('Protocolo não permitido.', 403)
  }
  const host = u.hostname
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new ProxyError('Host local bloqueado.', 403)
  }
  const addresses = await resolveAddresses(host)
  if (addresses.some(isPrivateIp)) {
    throw new ProxyError('Destino de rede privada bloqueado.', 403)
  }
  return { url: u, addresses }
}

function lookupWith(addresses) {
  return (_hostname, options, callback) => {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }
    const mapped = addresses.map((address) => ({
      address,
      family: address.includes(':') ? 6 : 4,
    }))
    if (options?.all) {
      callback(null, mapped)
      return
    }
    callback(null, mapped[0].address, mapped[0].family)
  }
}

function requestOnce(target, method, headerSource, addresses, signal) {
  const lib = target.protocol === 'https:' ? https : http
  return new Promise((resolve, reject) => {
    const req = lib.request(
      target,
      {
        method,
        lookup: lookupWith(addresses),
        servername: target.hostname,
        headers: {
          Host: target.host,
          'User-Agent': headerSource['user-agent'] || 'StreamHub-IPTV-Proxy/1.0',
          Accept: headerSource.accept || '*/*',
        },
      },
      (upstream) => resolve(upstream),
    )

    const abort = () => req.destroy()
    if (signal?.aborted) {
      abort()
      return
    }
    signal?.addEventListener('abort', abort, { once: true })
    req.setTimeout(60000, () => {
      req.destroy(new ProxyError('Timeout ao contatar o servidor IPTV.'))
    })
    req.on('error', reject)
    req.end()
  })
}

async function openUpstream(startUrl, method, headerSource, signal) {
  let current = new URL(startUrl)
  for (let hop = 0; hop < 5; hop += 1) {
    const safe = await assertSafeTarget(current.href)
    current = safe.url
    const upstream = await requestOnce(current, method, headerSource, safe.addresses, signal)
    const status = upstream.statusCode ?? 502
    const location = upstream.headers.location
    if (location && [301, 302, 303, 307, 308].includes(status)) {
      upstream.resume()
      current = new URL(location, current)
      continue
    }
    return { upstream, finalUrl: current }
  }
  throw new ProxyError('Muitos redirecionamentos do servidor IPTV.')
}

function readStream(stream) {
  return new Promise((resolve, reject) => {
    const chunks = []
    stream.on('data', (chunk) => chunks.push(chunk))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
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
  const controller = new AbortController()
  req.on('close', () => controller.abort())

  try {
    const { upstream, finalUrl } = await openUpstream(
      origin + targetPath,
      req.method,
      req.headers,
      controller.signal,
    )

    const status = upstream.statusCode ?? 502
    const contentType = String(upstream.headers['content-type'] || '')
    const isPlaylist =
      /mpegurl|m3u8|application\/vnd\.apple\.mpegurl/i.test(contentType) ||
      finalUrl.pathname.toLowerCase().endsWith('.m3u8')

    const outHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': isPlaylist ? 'no-cache' : 'public, max-age=60',
    }

    if (isPlaylist && req.method === 'GET') {
      const text = (await readStream(upstream)).toString('utf8')
      const rewritten = rewritePlaylist(text, finalUrl.href)
      outHeaders['Content-Type'] = 'application/vnd.apple.mpegurl; charset=utf-8'
      send(res, status, rewritten, outHeaders)
      return
    }

    if (contentType) outHeaders['Content-Type'] = contentType
    const len = upstream.headers['content-length']
    if (len) outHeaders['Content-Length'] = String(len)

    res.writeHead(status, outHeaders)
    if (req.method === 'HEAD') {
      upstream.resume()
      res.end()
      return
    }
    upstream.pipe(res)
  } catch (error) {
    if (!res.headersSent) {
      const status = error instanceof ProxyError ? error.status : 502
      const message = error instanceof Error ? error.message : 'Falha no proxy'
      send(res, status, message)
    } else {
      res.destroy()
    }
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
