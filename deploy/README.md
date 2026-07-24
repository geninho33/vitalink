# Deploy Docker — VitaLink

## Portas no host (oficiais)

| Serviço | Host | Container |
|---------|------|-----------|
| MySQL `vitalink-db` | **3308** | 3306 |
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

- Preferencial (login sem alerta de senha): `https://SEU_IP:3443/login`
- HTTP: `http://SEU_IP:3102`
- Health via Nginx (proxy): `http://SEU_IP:3102/api-health`
- Health API direta: `http://SEU_IP:3002/health` (pode estar bloqueada no firewall)
- Login seed: `admin@vitalink.local` / `Admin@Vitalink1`

## Ordem de subida (anti-502)

1. `vitalink-db` — healthcheck: `mysqladmin ping -h localhost -u root -pmasterkey`
2. `vitalink-backend` — só inicia com `depends_on: condition: service_healthy` no DB; o entrypoint confirma o MySQL via **mysql2** e então sobe a API na `:3333`
3. `vitalink-frontend` — só inicia com backend healthy; Nginx faz proxy de `/api/` → `vitalink-backend:3333`

## Diagnóstico de 502 no login

O 502 significa que o **Nginx não alcança o backend**. Quase sempre o container `vitalink-backend` está em crash-loop ou unhealthy.

```bash
cd deploy
git pull
./deploy.sh rebuild
./deploy.sh doctor
```

Manual:

```bash
docker compose -f docker-compose.yml ps
docker compose -f docker-compose.yml logs --tail=150 vitalink-backend
curl -s http://127.0.0.1:3102/api-health
curl -s -X POST http://127.0.0.1:3102/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@vitalink.local","senha":"Admin@Vitalink1"}'
```

Se o backend não sobe por senha root do MySQL divergente do volume antigo:

```bash
# Confira MYSQL_ROOT_PASSWORD em deploy/.env (mesma da 1ª criação do volume)
# Ou recrie o volume (APAGA DADOS):
docker compose -f docker-compose.yml down
docker volume rm vitalink_mysql_data
./deploy.sh rebuild
```

Libere no firewall, se necessário: `3102`, `3443` (e opcionalmente `3002`).

## Observações

- Aviso de “senha em página HTTP”: use a porta **3443 (HTTPS)** e aceite o certificado autoassinado.
- “Layout foi forçado…” / avisos de `-webkit-text-size-adjust` são inofensivos no Firefox.
