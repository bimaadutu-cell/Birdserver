# BirdServer — Railway deployment

## Required Railway setup

1. Create a PostgreSQL service in the same Railway project.
2. Connect the BirdServer service to that PostgreSQL service.
3. Make sure the BirdServer service has:
   - `DATABASE_URL` = the PostgreSQL connection string.
4. Optional:
   - `BIRDSERVER_ADMIN_USERNAME` (default: `admin`)
   - `BIRDSERVER_ADMIN_PASSWORD` (default: `admin00`)
   - `BIRDSERVER_ADMIN_EMAIL` (default: `admin@birdserver.local`)
5. Redeploy the service.

The application now runs an idempotent schema reconciliation on startup. It will create the tables and the default administrator when they are missing.

## Verify before logging in

Open:

`/api/health`

A ready deployment returns JSON containing:

- `"ready": true`
- `"database": "connected"`
- `"admin": true`

If it returns `DATABASE_URL_MISSING`, connect PostgreSQL to the BirdServer Railway service.

## Default login

Username: `admin`

Password: `admin00`

If you changed `BIRDSERVER_ADMIN_USERNAME` / `BIRDSERVER_ADMIN_PASSWORD`, use those values instead.

## Important

Do not put a local connection such as:

`postgresql://postgres:postgres@127.0.0.1:5432/app_db`

into Railway. Railway must use its PostgreSQL `DATABASE_URL`.
