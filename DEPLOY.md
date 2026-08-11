# BirdServer — Railway deployment (fixed)

## 1. Railway

Create one Railway service from this GitHub repository.

The repository intentionally uses `npm install` instead of `npm ci`, because the project does not require a committed lockfile. Nixpacks runs:

1. Node.js 20
2. `npm install --include=dev --no-audit --no-fund`
3. `npm run build`
4. `npm start`

`railway.json` uses `npm start` and `/api/health`.

## 2. Database

### Railway PostgreSQL
Add a PostgreSQL service in the same Railway project, then add a reference variable to the web service:

`DATABASE_URL = ${{Postgres.DATABASE_URL}}`

### Neon / external PostgreSQL
Set the web service variable `DATABASE_URL` to the Neon connection string. Do not commit it to GitHub.

The application automatically enables PostgreSQL SSL for managed providers and respects an explicit `sslmode` in the URL.

## 3. First boot

On the first request/health check BirdServer:

- creates/reconciles all required tables;
- repairs/creates the default admin;
- creates Node-01 automatically;
- allocates ports 25565–25620;
- then serves the panel.

Default admin:

- username: `admin`
- password: `admin00`

Change the password after first login if this panel is exposed publicly.

## 4. Diagnostics

Open:

`/api/health`

For a detailed safe diagnostic:

`/api/debug`

Unlike the previous build, migration errors are no longer silently swallowed. If the database is unreachable, `/api/health` reports the real failure instead of allowing a Server Component to fail later.

## 5. Creating a server

Go to:

`/admin/servers/create`

The form now uses a portable Node/npm startup command. It does not assume `/usr/local/bin/node` or `/usr/local/bin/npm`.

A server created by the panel runs as a child Node process inside the Railway web service. This is suitable for lightweight Node.js/WhatsApp bots, but it is **not** Docker/Pterodactyl isolation. For full container isolation and persistent storage, use a VPS + Docker/Pterodactyl.

## 6. Railway persistence

Railway containers have ephemeral local storage unless a Volume is attached. For persistent server files, attach a Railway Volume and set:

`BIRDSERVER_CONTAINERS_ROOT=/path/to/volume/birdserver-containers`

## 7. Important

Do not put database passwords, API keys, or session secrets into GitHub. Use Railway Variables / Neon secrets instead.
