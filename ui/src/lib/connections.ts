export type SavedConnection = { id: string; title: string; dsn: string }

const STORAGE_KEY = 'picodata-admin.connections'

// crypto.randomUUID only exists in secure contexts; http://<ip>:<port> is not one
export function newId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function loadSaved(): SavedConnection[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr: unknown = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr
      .filter((c): c is Record<string, unknown> => typeof c === 'object' && c !== null)
      .filter((c) => typeof c.dsn === 'string' && typeof c.title === 'string')
      .map((c) => ({
        id: typeof c.id === 'string' && c.id ? c.id : newId(),
        title: String(c.title),
        dsn: String(c.dsn),
      }))
  } catch {
    return []
  }
}

export function saveSaved(list: SavedConnection[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}


export type DsnParts = {
  host: string
  port: string
  user: string
  pass: string
  dbname: string
}

export function buildDsn(p: DsnParts): string {
  let s = 'postgresql://'
  if (p.user) {
    s += encodeURIComponent(p.user) + (p.pass ? ':' + encodeURIComponent(p.pass) : '') + '@'
  }
  s += p.host
  if (p.port) s += ':' + p.port
  if (p.dbname) s += '/' + p.dbname
  return s
}

function splitHostPort(hp: string): [string, string] {
  if (hp.startsWith('[')) {
    const close = hp.indexOf(']')
    return close < 0 ? [hp, ''] : [hp.slice(0, close + 1), hp.slice(close + 2)]
  }
  const colon = hp.lastIndexOf(':')
  return colon < 0 ? [hp, ''] : [hp.slice(0, colon), hp.slice(colon + 1)]
}

export function parseDsn(dsn: string): DsnParts {
  const m = /^postgresql:\/\/(?:([^@]*)@)?([^/?]*)(?:\/(.*)?)?$/i.exec(dsn)
  if (!m) return { host: '', port: '', user: '', pass: '', dbname: '' }
  const info = m[1] ?? ''
  const colon = info.indexOf(':')
  const dec = (v: string) => {
    try {
      return decodeURIComponent(v)
    } catch {
      return v
    }
  }
  const [host, port] = splitHostPort(m[2] ?? '')
  return {
    host,
    port,
    user: colon < 0 ? dec(info) : dec(info.slice(0, colon)),
    pass: colon < 0 ? '' : dec(info.slice(colon + 1)),
    dbname: m[3] ?? '',
  }
}

export function maskDsn(dsn: string): string {
  return buildDsn({ ...parseDsn(dsn), pass: '' })
}
