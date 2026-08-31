# Database

- **Canônico (produção/Docker):** [`schema.postgres.sql`](schema.postgres.sql) — PostgreSQL 16
- **Legado MySQL (não usado no deploy):** `schema.sql`, `patch_*.sql`
- **Catálogo público (rede de saúde):** [`seed_rede_saude.sql`](seed_rede_saude.sql) — hospitais, clínicas, farmácias e médicos (idempotente, `ON CONFLICT DO NOTHING`)
- **Massa sintética (LGPD):** `backend/src/seeds/runSeeds.js` via `./deploy.sh seed`
