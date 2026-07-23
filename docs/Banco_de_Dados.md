# Banco de Dados

## Conexão (desenvolvimento)

| Parâmetro | Valor |
|-----------|-------|
| Host | `localhost` |
| Porta | `3306` |
| Usuário | `root` |
| Senha | `masterkey` |
| Database | `vitalink` |

Script canônico: [`database/schema.sql`](../database/schema.sql)

```bash
mysql -h localhost -u root -pmasterkey < database/schema.sql
```

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
    enum status
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

| Tabela | Módulo |
|--------|--------|
| `perfis` | RBAC |
| `menus` | RBAC |
| `usuarios` | RBAC |
| `permissoes_acesso` | RBAC |
| `medicos` | Clínico |
| `remedios` | Prescrição |
| `auditoria_logs` | Conformidade |

---

## Seeds

- Perfis: Administrador, Médico, Atendente
- Menus: Dashboard, Usuários, Perfis, Médicos, Remédios, Auditoria
- Usuário admin: `admin@vitalink.local` / `Admin@Vitalink1`
- **Sem** seeds de pacientes, prontuários ou dados clínicos reais
