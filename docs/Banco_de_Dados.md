# Banco de Dados

## Conexão (desenvolvimento)

| Parâmetro | Valor |
|-----------|-------|
| Host | `localhost` |
| Porta | `5432` (Docker host: `5433`) |
| Usuário | `vitalink` |
| Senha | `vitalink_secret` |
| Database | `vitalink` |

Script canônico: [`database/schema.postgres.sql`](../database/schema.postgres.sql)

```bash
psql -h localhost -U vitalink -d vitalink -f database/schema.postgres.sql
```

Os arquivos `schema.sql` / `patch_*.sql` MySQL permanecem apenas como legado histórico.

---

## Diagrama lógico

```mermaid
erDiagram
  perfis ||--o{ usuarios : possui
  perfis ||--o{ permissoes_acesso : define
  menus ||--o{ permissoes_acesso : concede
  menus ||--o| menus : menu_pai
  usuarios ||--o| medicos : vincula
  usuarios ||--o{ auditoria_logs : gera

  perfis {
    int id PK
    varchar nome
    varchar descricao
  }
  menus {
    int id PK
    varchar titulo
    varchar rota
    int menu_pai_id FK
  }
  usuarios {
    int id PK
    varchar email UK
    varchar senha_hash
    text status
    int perfil_id FK
  }
  permissoes_acesso {
    int id PK
    int perfil_id FK
    int menu_id FK
    bool pode_ler
    bool pode_criar
    bool pode_editar
    bool pode_deletar
  }
  medicos {
    int id PK
    int usuario_id FK
    varchar crm
    char uf_crm
  }
  remedios {
    int id PK
    varchar nome_comercial
    varchar principio_ativo
  }
  auditoria_logs {
    bigint id PK
    int usuario_id FK
    varchar acao
    varchar recurso
  }
```

---

## Tabelas

17 tabelas no schema consolidado: RBAC (`perfis`, `menus`, `usuarios`, `permissoes_acesso`), saúde (`hospitais_clinicas`, `farmacias`, `cuidadores`, `responsaveis`, `medicos`, `pacientes`, `remedios`), atividades (`paciente_anamnese`, `consultas`, `atendimentos_rotina`, `atendimento_execucoes`, `agenda_eventos`) e `auditoria_logs`.

## Seed admin

| Campo | Valor |
|-------|-------|
| E-mail | `admin@vitalink.local` |
| Senha | `Admin@Vitalink1` |
