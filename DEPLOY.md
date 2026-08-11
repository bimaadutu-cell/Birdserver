# Deploy BirdServer

## Railway (recommended)

1. Push repo to GitHub.
2. Railway → **New Project** → **Deploy from GitHub Repo** → pick this repo.
3. In the same project: **New** → **Database** → **Add PostgreSQL**.
4. Click your **web service** → **Variables** tab.
5. Verify `DATABASE_URL` is set. If not, click **Add Reference** and pick `Postgres.DATABASE_URL`.
6. Redeploy.
7. Visit `https://<your-app>.up.railway.app/api/debug` to confirm all systems green.
8. Login at `/login` with `admin` / `admin00`.

### Optional env variables

| Variable                       | Default             | Description |
|--------------------------------|---------------------|-------------|
| `DATABASE_URL`                 | required            | PostgreSQL connection string |
| `BIRDSERVER_NODE_FQDN`         | auto-detect         | Public hostname for the auto-created node |
| `BIRDSERVER_NODE_RAM_MB`       | os.totalmem         | Node RAM budget in MB |
| `BIRDSERVER_NODE_CPU`          | cpus * 100          | Node CPU budget in % |
| `BIRDSERVER_NODE_STORAGE_MB`   | 102400              | Node storage budget in MB |
| `BIRDSERVER_CONTAINERS_ROOT`   | /tmp/birdserver-... | Where per-server files live |
| `NODE_ENV`                     | production          | Should be `production` |

## Vercel

1. Import repo on Vercel.
2. Add a Postgres integration (Vercel Postgres, Neon, Supabase, or any external).
3. Ensure `DATABASE_URL` or `POSTGRES_URL` is set in project env.
4. Deploy.

## Docker / VPS

```bash
git clone <repo>
cd birdserver
npm ci
npm run build
DATABASE_URL=postgres://user:pass@host:5432/db npm start
```

## Troubleshooting

- **Login shows `SERVER_ERROR`?** Open `/api/debug` to see the exact database error.
- **`column does not exist`?** The auto-migrate should fix it on the next request. Refresh once.
- **Railway DB connection times out?** Ensure the Postgres plugin is in the same project as the web service.
- **SSL error?** Auto-detected for Railway/Render/Vercel. Force with `?sslmode=require` in the URL if needed.
