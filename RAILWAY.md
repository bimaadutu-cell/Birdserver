# BirdServer — Railway deployment

## Required
1. Create a **PostgreSQL** service in the same Railway project.
2. Make sure this BirdServer service receives the PostgreSQL `DATABASE_URL` variable.
   The easiest way is to add a reference to the Postgres service's `DATABASE_URL`.
3. Deploy this project. The `start` script automatically runs:
   `drizzle-kit push`
   before `next start`, so the PostgreSQL schema is created/updated automatically.
4. Open the generated Railway public domain and log in with:
   - Username: `admin`
   - Password: `admin00`

## Important
Do **not** use the old hard-coded `127.0.0.1:5432` database URL. Railway cannot reach a database running on your phone/PC through that address.

The app listens on Railway's `PORT` automatically through `next start`.

If login still says "An internal error occurred", check the Railway deployment logs. The most common cause is a missing/incorrect `DATABASE_URL` or an unavailable PostgreSQL service.
