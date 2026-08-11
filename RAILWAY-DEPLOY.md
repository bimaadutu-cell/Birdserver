# BirdServer — Railway deployment

## Required variable

Set `DATABASE_URL` to the PostgreSQL/Neon connection string in Railway Variables.
Do not commit it to GitHub.

BirdServer uses the `birdserver` PostgreSQL schema by default (`BIRDSERVER_DB_SCHEMA` can override it). This intentionally isolates the app from old/incompatible tables in `public`.

## Admin

Default:
- username: `admin`
- password: `admin00`

Optional variables:
- `BIRDSERVER_ADMIN_USERNAME`
- `BIRDSERVER_ADMIN_PASSWORD`
- `BIRDSERVER_ADMIN_EMAIL`

For one-time recovery, set `BIRDSERVER_RESET_ADMIN_PASSWORD=1`, deploy, login successfully, then REMOVE that variable.

## Health

Open `/api/health`. A ready deployment returns `ready: true`, `database: connected`, and `admin: true`.

The runtime bootstrap is non-fatal: a temporary database failure no longer crashes the Railway container. The service stays online and `/api/health` reports the actual problem.
