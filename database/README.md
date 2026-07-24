# Database

- **Canônico (produção/Docker):** [`schema.postgres.sql`](schema.postgres.sql) — PostgreSQL 16
- **Legado MySQL (não usado no deploy):** `schema.sql`, `patch_*.sql`
- **Massa sintética (LGPD):** `backend/src/seeds/runSeeds.js` via `./deploy.sh seed`
