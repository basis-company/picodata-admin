export type Config = {
  connections: { title: string; dsn: string }[]
  connectionsReadOnly: boolean
  readOnly: boolean
  version: { tag: string; sha: string }
  latest: string
}

export type TableEntry = {
  name: string
  engine: string
  global: boolean
  distributed: string[]
  tier: string | null
}

export type Column = {
  name: string
  type: string
  nullable: boolean
  unsigned?: boolean
  array?: boolean
  primary?: boolean
  default?: unknown
}

export type IndexEntry = {
  name: string
  columns: string[]
  using: string
  unique: boolean
}

export type SpaceInfo = {
  name: string
  engine: string
  tier: string | null
  global: boolean
  distributed: string[]
  primary: string[]
  columns: Column[]
  indexes: IndexEntry[]
  rows: number | null
}

export type Cell = string | null

export type RowsPage = {
  rows: Record<string, Cell>[]
  columns?: string[]
  total: number | null
  order?: string[]
}

export type DbInfo = {
  version?: string
  instances?: {
    name: string
    tier: string
    replicaset_name: string
    current_state: string
    target_state: string
    picodata_version: string
    failure_domain: string
  }[]
  tiers?: {
    name: string
    replication_factor: number | string
    bucket_count: number | string
    is_default: boolean
    can_vote: boolean
    vshard_bootstrapped: boolean
  }[]
  replicasets?: {
    name: string
    tier: string
    current_master_name: string
    state: string
  }[]
  properties?: Record<string, string>
  tables?: number
  buckets?: { state: string; count: string }[]
}

export type SqlResult = {
  rows: Record<string, Cell>[]
  columns: string[]
  affected: number | null
}

export type Affected = { affected: number }
export type Ok = { ok: boolean }

export type Connection = { id: string; title: string; dsn: string; env: boolean }

export type View = { kind: 'info' } | { kind: 'sql' } | { kind: 'table'; name: string }
