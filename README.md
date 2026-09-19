# Picodata admin

This application can be used to manage schema and data in a [Picodata](https://picodata.io) cluster using a web gui.
It is a lightweight successor to [tarantool-admin](https://github.com/basis-company/tarantool-admin):
PHP 8.5 backend over [picodata.php](https://github.com/basis-company/picodata.php), React + shadcn/ui frontend.
Feel free to contribute any way.

## Running existing build
Run `docker run -p 8000:80 basiscompany/picodata-admin`
Open [http://localhost:8000](http://localhost:8000) in your browser.

## Configure using env
Application can be configured via environment:
* PICODATA_CHECK_VERSION - default is `true`. set to `false` if you want to disable version check
* PICODATA_CONNECTIONS - comma-separated connection strings (`postgres://user:pass@host:5432`)
* PICODATA_CONNECTIONS_READONLY - disable connections editor, only env connections are usable
* PICODATA_READONLY - disable any database changes (server side enforced)
* PICODATA_SQL_LIMIT - specifies a limit on the number of rows for SQL SELECT. By default, 500. To remove the limit, set 0.

Connections are stored in the browser localStorage; `PICODATA_CONNECTIONS` seeds
defaults and, with `PICODATA_CONNECTIONS_READONLY=true`, pins them.

## Known limitations
* JSON columns can be created and read, but current Picodata pgwire (26.1) has
  no syntax to write map/json values via SQL — writes to a JSON column fail
  with a server error. This is a Picodata limitation, not an admin one.
* Data grid pagination uses `LIMIT offset+limit` with client-side slicing,
  because the pgwire grammar has no `OFFSET`. Deep pages of huge spaces are slow.

## You can build image yourself.
* Clone repository: `git clone https://github.com/basis-company/picodata-admin.git`
* Change current directory: `cd picodata-admin`
* Run `docker build .`

## Development

* Install git, docker and nodejs
* Clone repository: `git clone https://github.com/basis-company/picodata-admin.git`
* Change current directory: `cd picodata-admin`
* Run developer environment using `docker compose up -d` (a one-node cluster boots on `127.0.0.1:5432`)
* Backend with live reload: `composer install && php -S 0.0.0.0:8080 -t public public/index.php` (needs `ext-pgsql`)
* Frontend with hot reload: `npm --prefix ui install && npm --prefix ui run dev` — open the printed vite URL
* Use "picodata-1-1:5432" (or "127.0.0.1:5432") connection with form default values:
  * username admin
  * password T0psecret
* API is plain REST, see [ui/API.md](ui/API.md): `POST/GET/PATCH/DELETE /api/...`,
  connection target passed in the `X-Connection` header
* Follow https://phptherightway.com/ recommendations
* Don't repeat yourself
