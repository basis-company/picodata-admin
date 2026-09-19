import { useEffect, useRef, useState, type DependencyList } from 'react'

export function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList) {
  const fnRef = useRef(fn)
  fnRef.current = fn
  const [state, setState] = useState<{
    data: T | null
    error: string | null
    loading: boolean
  }>({ data: null, error: null, loading: true })
  const [nonce, setNonce] = useState(0)
  useEffect(() => {
    let live = true
    setState((s) => ({ data: s.data, error: null, loading: true }))
    fnRef.current().then(
      (data) => live && setState({ data, error: null, loading: false }),
      (e: unknown) =>
        live && setState({ data: null, error: errMessage(e), loading: false }),
    )
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])
  return { ...state, reload: () => setNonce((n) => n + 1) }
}
