# Inclusão compartilhada HTTP/HTTPS — proxy da API
# DNS interno do Docker (evita 502 por resolução stale do upstream)
resolver 127.0.0.11 ipv6=off valid=10s;

set $vitalink_upstream vitalink-backend:3333;

proxy_http_version 1.1;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header Connection "";
proxy_connect_timeout 10s;
proxy_send_timeout 120s;
proxy_read_timeout 120s;
proxy_next_upstream error timeout http_502 http_503 http_504;

# Preserva /api/v1/... no backend
proxy_pass http://$vitalink_upstream;
