# Deploy Docker — VitaLink

## Portas no host (oficiais)

| Serviço | Host | Container |
|---------|------|-----------|
| MySQL `vitalink-db` | **3308** | 3306 |
| Backend `vitalink-backend` | **3002** | 3333 |
| Frontend `vitalink-frontend` | **3102** | 80 |

Evita conflito com 3306/3307, 3000, 3100/3101, 8001, 8081, 5678.

## Arquivos

| Arquivo | Função |
|---------|--------|
| `Dockerfile.backend` | Multi-stage Node 20 + entrypoint |
| `Dockerfile.frontend` | Build Vite + Nginx (proxy `/api`) |
| `docker-compose.yml` | DB + API + Web |
| `.env.example` | Variáveis e portas |
| `docker-entrypoint.sh` | Wait MySQL + migrações + start |
| `deploy.sh` | Build/up/down/logs/git |
| `nginx.conf` | SPA + proxy API |

## Uso rápido

```bash
cd deploy
cp .env.example .env
chmod +x deploy.sh docker-entrypoint.sh
./deploy.sh up
```

- App: http://localhost:3102  
- Health API: http://localhost:3002/health  
- Admin seed: `admin@vitalink.local` / `Admin@Vitalink1`

```bash
./deploy.sh logs
./deploy.sh down
./deploy.sh git-status
```

## Git

`deploy.sh git-push` envia a branch configurada em `GIT_BRANCH` (default `dev`).
