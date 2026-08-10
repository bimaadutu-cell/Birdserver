# BirdServer Railway - Final Build Fix

## What caused the Railway build failure

Next.js was trying to prerender database-backed pages such as `/admin/users` during
`next build`. Those pages execute PostgreSQL queries, but Railway's runtime
`DATABASE_URL` is not guaranteed to be available during the build phase.

That produced:

`Error occurred prerendering page "/admin/users"`

and then:

`relation "servers" does not exist`

The PostgreSQL SSL message shown above it is only a warning; it is not the build
failure.

## Fix

All database/session-backed pages are explicitly marked:

```ts
export const dynamic = "force-dynamic";
```

Therefore they are rendered only on the Railway server at request time, after
the runtime database connection is available.

The existing runtime migration still creates/repairs the required PostgreSQL
tables on first request. `/api/health` also runs the migration/bootstrap checks.

## Railway variables

Connect a Railway PostgreSQL service to the BirdServer service so that
`DATABASE_URL` is available at runtime.

Optional admin variables:

- `BIRDSERVER_ADMIN_USERNAME=admin`
- `BIRDSERVER_ADMIN_PASSWORD=admin00`
- `BIRDSERVER_ADMIN_EMAIL=admin@birdserver.local`

After deployment, open:

`/api/health`

A healthy deployment should return JSON containing:

- `ready: true`
- `database: "connected"`
- `admin: true`

Then log in with the configured admin credentials.

## Important

Do not add a database migration command to `next build`. The application performs
the runtime migration when it starts receiving requests. This prevents build-time
prerendering from depending on Railway PostgreSQL.
