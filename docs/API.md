# Contrato de APIs — VitaLink v1

Base: `/api/v1`  
Auth: `Authorization: Bearer <jwt>`

## Auth

### `POST /auth/login`

Body:
```json
{ "email": "admin@vitalink.local", "senha": "Admin@Vitalink1" }
```

Resposta 200:
```json
{
  "token": "<jwt>",
  "tokenType": "Bearer",
  "expiresIn": "8h",
  "usuario": {
    "id": 1,
    "nome": "Administrador VitaLink",
    "email": "admin@vitalink.local",
    "perfil": { "id": 1, "nome": "Administrador" }
  },
  "menus": [
    {
      "id": 1,
      "titulo": "Dashboard",
      "rota": "/dashboard",
      "icone": "layout-dashboard",
      "ordem": 10,
      "menuPaiId": null,
      "permissoes": { "ler": true, "criar": true, "editar": true, "deletar": true }
    }
  ]
}
```

## Menus

### `GET /menus/me`
Retorna menus com `pode_ler = 1` para o perfil do token.

## CRUDs (todos autenticados + RBAC)

| Recurso | Métodos |
|---------|---------|
| `/usuarios` | GET, POST, PUT `/:id`, DELETE `/:id` |
| `/perfis` | GET, POST, PUT `/:id` |
| `/medicos` | GET, POST, PUT `/:id`, DELETE `/:id` |
| `/remedios` | GET, GET `/:id`, POST, PUT `/:id`, DELETE `/:id` |

Query opcional em remédios: `?q=termo` (nome comercial ou princípio ativo).
