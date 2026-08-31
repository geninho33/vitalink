# Deploy Docker — VitaLink (PostgreSQL 16)

## Portas no host (oficiais)

| Serviço | Host | Container |
|---------|------|-----------|
| PostgreSQL `vitalink-db` | **5433** | 5432 | imagem `postgres:16-alpine` |
| Backend `vitalink-backend` | **3002** | 3333 |
| Frontend HTTP | **3102** | 80 |
| Frontend HTTPS | **3443** | 443 |

## Uso rápido

```bash
cd deploy
cp .env.example .env
chmod +x deploy.sh docker-entrypoint.sh
./deploy.sh rebuild
```

- Preferencial: `https://SEU_IP:3443/login`
- HTTP: `http://SEU_IP:3102`
- Health via Nginx: `http://SEU_IP:3102/api-health`
- Login seed: `admin@vitalink.local` / `Admin@Vitalink1`

## Ordem de subida (anti-502)

1. `vitalink-db` — healthcheck: `pg_isready`
2. `vitalink-backend` — espera TCP PostgreSQL com Node `net`, aplica `schema.postgres.sql` via `pg`, sobe API `:3333`
3. `vitalink-frontend` — proxy `/api/` → `vitalink-backend:3333`

Todos usam a rede bridge `vitalink-net`.

## Migração a partir do MySQL

O volume antigo `vitalink_mysql_data` **não** é reutilizado. Recrie a stack:

```bash
cd deploy
docker compose down
docker volume rm vitalink_mysql_data 2>/dev/null || true
./deploy.sh rebuild
```

O catálogo público (hospitais, clínicas, farmácias e médicos) é aplicado automaticamente
no `db-prepare` do entrypoint (`SEED_REDE_SAUDE=true`, padrão). Idempotente: não sobrescreve
registros já existentes.

```bash
./deploy.sh seed-rede
# ou
cd backend && npm run db:seed:rede
```

SQL: `database/seed_rede_saude.sql`

## Massa de dados (seed sintético)

```bash
./deploy.sh seed
```

Gera hospitais, farmácias, remédios, médicos, cuidadores, responsáveis, pacientes,
anamneses, consultas, rotinas e `agenda_eventos` com dados fictícios (LGPD).

- Script: `backend/src/seeds/runSeeds.js`
- Placeholder initdb: `deploy/initdb/04-seed_massa_dados.sql`
- Senha dos usuários seed: `Seed@Vitalink1`
- Exemplo: `medico01@seed.vitalink.local`

Idempotente: pode rodar várias vezes (remove a massa anterior marcada como seed).

```bash
./deploy.sh doctor
docker compose logs --tail=100 vitalink-backend
curl -s http://127.0.0.1:3102/api-health
```
