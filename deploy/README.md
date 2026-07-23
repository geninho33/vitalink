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

- HTTP:  `http://SEU_IP:3102`
- HTTPS: `https://SEU_IP:3443` (certificado autoassinado — aceite o aviso do navegador)
- Health API direta: `http://SEU_IP:3002/health`
- Login seed: `admin@vitalink.local` / `Admin@Vitalink1`

## Diagnóstico de 502 no login

```bash
docker compose -f docker-compose.yml ps
docker compose -f docker-compose.yml logs --tail=100 vitalink-backend
curl -s http://127.0.0.1:3002/health
curl -s -X POST http://127.0.0.1:3102/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@vitalink.local","senha":"Admin@Vitalink1"}'
```

## Observações

- Aviso de “senha em página HTTP”: use a porta **3443 (HTTPS)** ou coloque um proxy com certificado válido na frente.
- Avisos de `-webkit-text-size-adjust` / `-moz-osx-font-smoothing` vêm do CSS do Tailwind e são inofensivos no Firefox.
