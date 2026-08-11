# Railway build fix

The previous build could hang while prerendering `/admin/logs` and `/admin/api-docs`.
The admin layout was executing PostgreSQL migration/bootstrap during `next build`.

This version fixes that by:
- marking the admin route tree `force-dynamic`;
- explicitly marking `/admin/logs` and `/admin/api-docs` dynamic;
- removing migration/bootstrap from `src/app/admin/layout.tsx`;
- running `npm run db:migrate` in Railway's start command before `next start`;
- leaving `/api/health` responsible for first-boot bootstrap and health verification.

Do not run database DDL from a Server Component/layout during `next build`.
