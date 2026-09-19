# picodata-admin HTTP API contract (REST) — implement exactly

Base: `/api`. The connection target travels in the **`X-Connection` request
header**: a libpq URI, e.g. `postgresql://admin:secret@host:5432/dbname`
(dbname may be absent). Every endpoint below except `/api/config` requires it.

Success: `200` (or `201` for creation) with the JSON `data` **directly** (no
`{success:true}` wrapper). Failure: 4xx/5xx with `{"error": "message"}` —
connection failures and SQL errors are `500`, validation `400`, unknown table `404`.

## Endpoints

### GET /api/config  (no header)
```json
{
  "connections": [{"title": "picodata-1-1:5432", "dsn": "postgresql://admin:secret@picodata-1-1:5432"}],
  "connectionsReadOnly": false,
  "readOnly": false,
  "version": {"tag": "unknown", "sha": "unknown"},
  "latest": ""
}
```
`connectionsReadOnly` → hide connection editor; only env-provided connections usable.
`readOnly` → server refuses all mutations (403); hide create/edit/delete/truncate/drop UI.

### GET /api/info
```json
{
  "version": "26.1.6",
  "instances": [{"name","tier","replicaset_name","current_state","target_state","picodata_version","failure_domain"}],
  "tiers": [{"name","replication_factor","bucket_count","is_default","can_vote","vshard_bootstrapped"}],
  "replicasets": [{"name","tier","current_master_name","state"}],
  "properties": {"cluster_version": "26.1.6", "global_schema_version": "9"},
  "tables": 12,
  "buckets": [{"state": "active", "count": "3000"}]
}
```
Any key may be missing if the cluster refused that query. `current_state` is
already simplified to `"Online"` server-side.

### GET /api/tables
`[{"name":"user","engine":"vinyl","global":false,"distributed":["id"],"tier":"default"}]`
`global:true` ⇒ `distributed` is `[]`; system tables are named `_pico_*`.

### POST /api/tables  (201)
```json
{
  "name": "orders", "engine": "memtx", "global": false,
  "distributed": ["id"], "tier": null,
  "columns": [{"name": "id", "type": "INTEGER", "nullable": false, "primary": true},
               {"name": "username", "type": "TEXT", "nullable": true, "primary": false}],
  "indexes": [{"name": null, "columns": ["username"], "unique": false, "using": "TREE"}]
}
```
types: INTEGER | DOUBLE | TEXT | BOOLEAN | DATETIME | UUID | DECIMAL | JSON.
using: TREE | HASH. `global: true` ⇒ `distributed: []`.
→ `{"sql": ["CREATE TABLE ...", "CREATE INDEX ..."]}`

### GET /api/tables/{name}
```json
{
  "name": "user", "engine": "vinyl", "tier": "default", "global": false,
  "distributed": ["id"], "primary": ["id"],
  "columns": [{"name","type","nullable","unsigned","array","primary","default"}],
  "indexes": [{"name","columns":["username"],"using":"TREE","unique":false}],
  "rows": 42
}
```
`rows` may be `null` (count unsupported).

### DELETE /api/tables/{name} → `{"ok": true}`
### POST /api/tables/{name}/truncate → `{"affected": N}`

### GET /api/tables/{name}/rows?offset=0&limit=50
`{"rows": [{"id": "1", "name": "bob"}], "columns": ["id","name"], "total": 137, "order": ["id"]}`
All cell values arrive as strings or `null` (pg text protocol). `total` may be null.

### POST /api/tables/{name}/rows
body `{"values": {"id": 1, "name": "bob"}}` → `{"affected": 1}`

### PATCH /api/tables/{name}/rows
body `{"key": {"id": "1"}, "values": {"name": "bobby"}}` → `{"affected": 1}`

### DELETE /api/tables/{name}/rows
body `{"key": {"id": "1"}}` → `{"affected": 1}`
`key` = full primary key column→value map (from GET table `primary` + row cells).

### POST /api/tables/{name}/indexes
`{"name": null, "columns": ["username"], "unique": false, "using": "TREE"}` → `{"ok": true}`

### DELETE /api/indexes/{name} → `{"ok": true}`

### POST /api/sql
body `{"query": "SELECT ..."}` (single statement)
→ `{"rows": [...], "columns": ["id","name"], "affected": null}` for SELECT-ish,
else `{"rows": [], "columns": [], "affected": N}`. Server caps SELECT rows (env).

## Client notes
- Wrap fetch: `api(method, path, {body})` sets `X-Connection` from the active
  connection state, `Content-Type: application/json`, throws `Error(json.error)`
  on non-2xx.
- Table names in paths: `encodeURIComponent`.
- Column names in `POST /api/sql` results may be `col_1` style when unaliased.
- `_pico_*` tables: render them, but in a separate "system" group in the sidebar.
