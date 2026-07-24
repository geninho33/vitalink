# Ambiente e variáveis

## Backend (`backend/.env`)

Copie a partir de `backend/.env.example`:

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `NODE_ENV` | Ambiente | `development` |
| `PORT` | Porta HTTP | `3333` |
| `API_PREFIX` | Prefixo das rotas | `/api/v1` |
| `DB_HOST` | Host PostgreSQL | `localhost` |
| `DB_PORT` | Porta PostgreSQL | `5432` |
| `DB_USER` | Usuário PostgreSQL | `vitalink` |
| `DB_PASSWORD` | Senha PostgreSQL | `vitalink_secret` |
| `DB_NAME` | Database | `vitalink` |
| `JWT_SECRET` | Segredo de assinatura JWT | string longa |
| `JWT_EXPIRES_IN` | Validade do token | `8h` |
| `CORS_ORIGIN` | Origens permitidas do frontend (separadas por vírgula) | `http://localhost:5173,http://localhost:5175` |

## Frontend (`frontend/.env`)

Copie a partir de `frontend/.env.example`:

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `VITE_API_URL` | Base da API | `http://localhost:3333/api/v1` |

## Deploy Docker (`deploy/.env`)

| Variável | Descrição | Default |
|----------|-----------|---------|
| `VITALINK_DB_HOST_PORT` | Porta host do Postgres | `5433` |
| `VITALINK_PG_IMAGE` | Imagem Docker | `postgres:16-alpine` |
| `DB_USER` / `DB_PASSWORD` / `DB_NAME` | Credenciais do banco | `vitalink` / `vitalink_secret` / `vitalink` |

## Credenciais seed (apenas desenvolvimento)

| Campo | Valor |
|-------|-------|
| E-mail | `admin@vitalink.local` |
| Senha | `Admin@Vitalink1` |

Altere a senha e o `JWT_SECRET` antes de qualquer ambiente compartilhado.
