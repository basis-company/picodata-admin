import { useCallback, useEffect, useState } from 'react'
import { api, setActiveDsn } from '@/lib/api'
import { errMessage } from '@/lib/hooks'
import type { Config, Connection, View } from '@/types'
import { HomeView } from '@/components/HomeView'
import { Shell } from '@/components/Shell'

export default function App() {
  const [config, setConfig] = useState<Config | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)
  const [conn, setConn] = useState<Connection | null>(null)
  const [view, setView] = useState<View>({ kind: 'info' })

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

  const connect = (c: Connection) => {
    setActiveDsn(c.dsn)
    setConn(c)
    setView({ kind: 'info' })
  }

  const disconnect = () => {
    setActiveDsn(null)
    setConn(null)
  }

  if (!conn) {
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
