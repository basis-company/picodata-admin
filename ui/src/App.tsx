import { useCallback, useEffect, useRef, useState } from 'react'
import { api, setActiveDsn } from '@/lib/api'
import { errMessage } from '@/lib/hooks'
import { loadSaved } from '@/lib/connections'
import type { Config, Connection, View } from '@/types'
import { HomeView } from '@/components/HomeView'
import { Shell } from '@/components/Shell'

export default function App() {
  const [config, setConfig] = useState<Config | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)
  const [conn, setConn] = useState<Connection | null>(null)
  const [view, setView] = useState<View>({ kind: 'info' })
  const [autoOff, setAutoOff] = useState(false)
  const connRef = useRef<Connection | null>(null)
  connRef.current = conn

  const loadConfig = useCallback(() => {
    api<Config>('GET', '/config').then(
      (c) => {
        setConfig(c)
        setConfigError(null)
      },
      (e: unknown) => setConfigError(errMessage(e)),
    )
  }, [])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  // auto-connect: exactly one connection available → connect as soon as we know, no home flash
  useEffect(() => {
    if (connRef.current || autoOff || configError || !config) return
    const rows: Connection[] = [
      ...config.connections.map((c) => ({ id: `env:${c.dsn}`, title: c.title, dsn: c.dsn, env: true })),
      ...(config.connectionsReadOnly ? [] : loadSaved().map((c) => ({ ...c, env: false }))),
    ]
    if (rows.length !== 1) return
    setActiveDsn(rows[0].dsn)
    setConn(rows[0])
    setView({ kind: 'info' })
  }, [config, configError, autoOff])

  const connect = (c: Connection) => {
    setActiveDsn(c.dsn)
    setConn(c)
    setView({ kind: 'info' })
  }

  const disconnect = () => {
    setAutoOff(true)
    setActiveDsn(null)
    setConn(null)
  }

  if (!conn) {
    // single connection and no user intent to stay → render nothing until connected
    if (!autoOff && !configError && (!config || [...config.connections, ...(config.connectionsReadOnly ? [] : loadSaved())].length === 1))
      return null
    return (
      <HomeView
        config={config}
        error={configError}
        onReload={loadConfig}
        onConnect={connect}
      />
    )
  }
  return (
    <Shell
      conn={conn}
      config={config}
      view={view}
      onView={setView}
      onDisconnect={disconnect}
    />
  )
}
