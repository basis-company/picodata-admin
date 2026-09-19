let activeDsn: string | null = null

export function setActiveDsn(dsn: string | null) {
  activeDsn = dsn
}

export async function api<T = unknown>(
  method: string,
  path: string,
  opts: { body?: unknown } = {},
): Promise<T> {
  const headers: Record<string, string> = {}
  if (activeDsn !== null) headers['X-Connection'] = activeDsn
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  const res = await fetch('/api' + path, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  })
  const text = await res.text()
  let payload: unknown
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = text
    }
  }
  if (!res.ok) {
    let message = `HTTP ${res.status} ${res.statusText}`
    if (typeof payload === 'object' && payload !== null && 'error' in payload) {
      message = String(payload.error)
    }
    throw new Error(message)
  }
  return payload as T
}
