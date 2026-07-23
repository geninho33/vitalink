# Contratos de API — VitaLink (OpenAPI / SDD Item 3)

**Base URL (dev):** `http://localhost:3333/api/v1`  
**Autenticação:** `Authorization: Bearer <jwt>` (exceto login e health)

Este documento é a especificação canônica dos contratos. Inclui rotas **já implementadas** e rotas do domínio de monitoramento **especificadas para implementação** (marcadas como *Planejado*).

---

## 1. OpenAPI 3.0 (YAML)

```yaml
openapi: 3.0.3
info:
  title: VitaLink API
  version: 1.1.0
  description: |
    API de gestão de saúde domiciliar, RBAC, rotina de medicamentos e monitoramento.
    Dados clínicos sensíveis não devem aparecer em logs de aplicação.
  contact:
    name: VitaLink
servers:
  - url: http://localhost:3333/api/v1
    description: Desenvolvimento local
tags:
  - name: Auth
  - name: Menus
  - name: Usuarios
  - name: Perfis
  - name: Medicos
  - name: Remedios
  - name: Monitoramento
  - name: Pacientes

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    Error:
      type: object
      properties:
        error:
          type: string
        message:
          type: string

    LoginRequest:
      type: object
      required: [email, senha]
      properties:
        email:
          type: string
          format: email
          example: admin@vitalink.local
        senha:
          type: string
          format: password
          example: Admin@Vitalink1

    MenuPermissoes:
      type: object
      properties:
        ler: { type: boolean }
        criar: { type: boolean }
        editar: { type: boolean }
        deletar: { type: boolean }

    MenuItem:
      type: object
      properties:
        id: { type: integer }
        titulo: { type: string }
        rota: { type: string }
        icone: { type: string, nullable: true }
        ordem: { type: integer }
        menuPaiId: { type: integer, nullable: true }
        permissoes:
          $ref: '#/components/schemas/MenuPermissoes'

    LoginResponse:
      type: object
      properties:
        token: { type: string }
        tokenType: { type: string, example: Bearer }
        expiresIn: { type: string, example: 8h }
        usuario:
          type: object
          properties:
            id: { type: integer }
            nome: { type: string }
            email: { type: string }
            perfil:
              type: object
              properties:
                id: { type: integer }
                nome: { type: string }
        menus:
          type: array
          items:
            $ref: '#/components/schemas/MenuItem'

    DoseStatus:
      type: string
      enum: [pendente, ministrado, atrasado, esquecido, recusado]

    RotinaDiariaItem:
      type: object
      properties:
        paciente_remedio_id: { type: integer }
        remedio_id: { type: integer }
        nome_comercial: { type: string }
        principio_ativo: { type: string }
        dose: { type: string, example: "1 comprimido" }
        horario: { type: string, example: "08:00" }
        status:
          $ref: '#/components/schemas/DoseStatus'
        confirmado_em:
          type: string
          format: date-time
          nullable: true
        observacao:
          type: string
          nullable: true

    RotinaDiariaResponse:
      type: object
      properties:
        paciente_id: { type: integer }
        data: { type: string, format: date }
        itens:
          type: array
          items:
            $ref: '#/components/schemas/RotinaDiariaItem'

    RegistroDoseRequest:
      type: object
      required: [paciente_id, remedio_id, data_hora, status]
      properties:
        paciente_id:
          type: integer
        remedio_id:
          type: integer
        data_hora:
          type: string
          format: date-time
          example: "2026-07-23T08:05:00-03:00"
        status:
          type: string
          enum: [confirmado, atrasado, esquecido, recusado]
          example: confirmado
        observacao:
          type: string
          example: Paciente aceitou sem intercorrências

    RegistroDoseResponse:
      type: object
      properties:
        id: { type: integer }
        paciente_id: { type: integer }
        remedio_id: { type: integer }
        status: { type: string }
        registrado_em: { type: string, format: date-time }

security:
  - bearerAuth: []

paths:
  /auth/login:
    post:
      tags: [Auth]
      summary: Autentica usuário e retorna JWT + menus do perfil
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LoginRequest'
      responses:
        '200':
          description: Autenticado
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/LoginResponse'
        '400':
          description: Validação
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '401':
          description: Credenciais inválidas
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '403':
          description: Usuário inativo/bloqueado
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /menus/me:
    get:
      tags: [Menus]
      summary: Menus acessíveis ao usuário autenticado
      responses:
        '200':
          description: Lista de menus
          content:
            application/json:
              schema:
                type: object
                properties:
                  menus:
                    type: array
                    items:
                      $ref: '#/components/schemas/MenuItem'
        '401':
          description: Não autenticado

  /pacientes/{id}/rotina-diaria:
    get:
      tags: [Pacientes, Monitoramento]
      summary: Rotina de medicamentos do dia do paciente
      description: |
        **Planejado / contrato SDD.** Retorna horários e status das doses do dia.
        Requer vínculo (cuidador/médico/familiar) ou perfil Administrador.
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: integer }
        - name: data
          in: query
          required: false
          description: Data no formato YYYY-MM-DD (default = hoje, timezone do servidor)
          schema: { type: string, format: date }
      responses:
        '200':
          description: Rotina do dia
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RotinaDiariaResponse'
        '401':
          description: Não autenticado
        '403':
          description: Sem vínculo/permissão
        '404':
          description: Paciente não encontrado

  /monitoramento/registro-dose:
    post:
      tags: [Monitoramento]
      summary: Registra confirmação (ou desfecho) de dose administrada
      description: |
        **Planejado / contrato SDD.** Usado pelo cuidador no checklist diário.
        Gera auditoria sem gravar dados clínicos extensos em log de aplicação.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RegistroDoseRequest'
      responses:
        '201':
          description: Dose registrada
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RegistroDoseResponse'
        '400':
          description: Payload inválido
        '401':
          description: Não autenticado
        '403':
          description: Cuidador sem vínculo com o paciente
```

---

## 2. Detalhamento Markdown das rotas prioritárias

### 2.1. `POST /api/v1/auth/login` — Implementado

**Headers:** `Content-Type: application/json`

**Payload**

```json
{
  "email": "string",
  "senha": "string"
}
```

**Resposta 200**

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
      "permissoes": {
        "ler": true,
        "criar": true,
        "editar": true,
        "deletar": true
      }
    }
  ]
}
```

**Erros**

| HTTP | `error` | Quando |
|------|---------|--------|
| 400 | `validation_error` | E-mail ou senha ausentes |
| 401 | `invalid_credentials` | Credenciais inválidas |
| 403 | `user_inactive` | Usuário inativo/bloqueado |

**Auditoria:** `login_sucesso` ou `login_falha` em `auditoria_logs` (sem senha).

---

### 2.2. `GET /api/v1/pacientes/{id}/rotina-diaria` — Planejado (contrato SDD)

**Headers**

```http
Authorization: Bearer <token>
```

**Query (opcional):** `?data=2026-07-23`

**Resposta 200**

```json
{
  "paciente_id": 10,
  "data": "2026-07-23",
  "itens": [
    {
      "paciente_remedio_id": 3,
      "remedio_id": 12,
      "nome_comercial": "Exemplo Genérico",
      "principio_ativo": "principio.exemplo",
      "dose": "1 comprimido",
      "horario": "08:00",
      "status": "pendente",
      "confirmado_em": null,
      "observacao": null
    },
    {
      "paciente_remedio_id": 3,
      "remedio_id": 12,
      "nome_comercial": "Exemplo Genérico",
      "principio_ativo": "principio.exemplo",
      "dose": "1 comprimido",
      "horario": "20:00",
      "status": "atrasado",
      "confirmado_em": null,
      "observacao": null
    }
  ]
}
```

**Status de dose**

| Status | Significado |
|--------|-------------|
| `pendente` | Ainda na janela / aguardando confirmação |
| `ministrado` | Confirmado pelo cuidador |
| `atrasado` | Passou da janela sem confirmação |
| `esquecido` | Marcado como não administrado |
| `recusado` | Paciente recusou a dose |

---

### 2.3. `POST /api/v1/monitoramento/registro-dose` — Planejado (contrato SDD)

**Headers**

```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Payload**

```json
{
  "paciente_id": 10,
  "remedio_id": 12,
  "data_hora": "2026-07-23T08:05:00-03:00",
  "status": "confirmado",
  "observacao": "Paciente aceitou sem intercorrências"
}
```

**Resposta 201**

```json
{
  "id": 501,
  "paciente_id": 10,
  "remedio_id": 12,
  "status": "confirmado",
  "registrado_em": "2026-07-23T08:05:12-03:00"
}
```

**Regras**

1. Somente cuidador vinculado (ou Admin) pode registrar.
2. `status: confirmado` mapeia para dose `ministrado` na rotina do dia.
3. Auditoria grava `acao=registro_dose`, `recurso=monitoramento`, `recurso_id=<id>` — observação clínica não vai para log de arquivo.

---

## 3. Rotas RBAC / clínico já disponíveis

| Método | Rota | Status |
|--------|------|--------|
| GET | `/menus/me` | Implementado |
| GET/POST/PUT/DELETE | `/usuarios` | Implementado |
| GET/POST/PUT | `/perfis` | Implementado |
| GET/POST/PUT/DELETE | `/medicos` | Implementado |
| GET/POST/PUT/DELETE | `/remedios` | Implementado |
| GET | `/health` (fora de `/api/v1`) | Implementado |

Todas as rotas autenticadas exigem `Authorization: Bearer <token>` e checagem RBAC por menu/rota.

---

## 4. Modelo de erro padrão

```json
{
  "error": "forbidden",
  "message": "Permissão insuficiente para este recurso."
}
```

---

## 5. Segurança e LGPD nos contratos

- Não retornar `senha_hash` em nenhuma resposta.
- Não registrar body completo de endpoints clínicos em logger de aplicação.
- Preferir IDs e códigos de ação na auditoria.
- Em demos/documentação, usar apenas dados fictícios (nunca prontuários reais).

---

## 6. Rastreabilidade

| Spec | Implementação atual |
|------|---------------------|
| Login JWT + menus | `backend/src/routes/auth.routes.js`, `menus.routes.js` |
| Rotina diária | Contrato — implementação futura |
| Registro de dose | Contrato — implementação futura |
| Spec funcional | `docs/especificacao-funcional.md` |
