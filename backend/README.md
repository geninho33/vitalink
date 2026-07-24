# VitaLink API

API Node.js (Express) com JWT Bearer, RBAC e PostgreSQL.

## Setup rápido

```bash
cd backend
cp .env.example .env
npm install
```

Aplicar schema:

```bash
psql -h localhost -U vitalink -d vitalink -f ../database/schema.postgres.sql
```

Subir:

```bash
npm run dev
```

Health: `GET http://localhost:3333/health`

## Endpoints principais

| Método | Rota | Auth |
|--------|------|------|
| POST | `/api/v1/auth/login` | Não |
| GET | `/api/v1/menus/me` | Bearer |
| GET/POST/PUT/DELETE | `/api/v1/usuarios` | Bearer + RBAC |
| GET/POST/PUT | `/api/v1/perfis` | Bearer + RBAC |
| GET/POST/PUT/DELETE | `/api/v1/medicos` | Bearer + RBAC |
| GET/POST/PUT/DELETE | `/api/v1/remedios` | Bearer + RBAC |

### Login (exemplo)

```json
POST /api/v1/auth/login
{
  "email": "admin@vitalink.local",
  "senha": "Admin@Vitalink1"
}
```

Resposta inclui `token`, `usuario` e `menus` do perfil.

## LGPD

- Logs de aplicação sanitizam campos sensíveis (`email`, `senha`, tokens, dados clínicos).
- `auditoria_logs` registra ação/recurso/IP — sem payloads de prontuário.
- Seeds do schema não incluem dados clínicos de pacientes.
