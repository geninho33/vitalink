# Especificação Funcional

## Visão do produto

**VitaLink** é uma plataforma de gestão de saúde com catálogo de medicamentos, cadastro de médicos e controle de acesso por perfis (RBAC), com trilha de auditoria alinhada à LGPD.

Escopo desta especificação (SDD v1): módulos de **Segurança e Acesso**, **Clínico & Prescrição** e **Auditoria e Conformidade**.

---

## 1. Módulo de Segurança e Acesso (RBAC)

### Objetivos
- Autenticar usuários via e-mail/senha
- Emitir API Token JWT (Bearer)
- Vincular usuário a um perfil
- Expor menus dinamicamente conforme permissões do perfil

### Regras de negócio
1. Usuário com `status != ativo` não autentica.
2. Senha armazenada apenas como `senha_hash` (bcrypt).
3. Login bem-sucedido retorna `token`, dados do usuário e lista de menus com flags CRUD.
4. Endpoints protegidos exigem header `Authorization: Bearer <token>`.
5. Operações de recurso exigem flag correspondente (`pode_ler|criar|editar|deletar`) no menu associado.

### Atores
| Perfil seed | Uso |
|-------------|-----|
| Administrador | Gestão completa |
| Médico | Médicos e remédios |
| Atendente | Leitura operacional |

### Telas
- Login
- Sidebar dinâmica (`GET /menus/me`)
- CRUD Usuários
- CRUD Perfis / Permissões

---

## 2. Módulo Clínico & Prescrição

### Objetivos
- Cadastrar médicos (CRM + UF + especialidade)
- Manter catálogo de remédios (nome comercial, princípio ativo, forma farmacêutica, ANVISA)

### Regras de negócio
1. CRM + UF é único.
2. Vínculo `medicos.usuario_id` é opcional.
3. Remédios são catálogo farmacêutico — **não** prontuário de paciente.
4. Busca textual por nome comercial ou princípio ativo.

### Entidades
- `medicos`
- `remedios`

---

## 3. Módulo de Auditoria e Conformidade

### Objetivos
- Registrar eventos de acesso e mutações relevantes
- Evitar gravação de dados clínicos / PII sensível em logs de aplicação

### Regras de negócio
1. Login sucesso/falha gera registro em `auditoria_logs`.
2. CRUD de usuários, perfis, médicos e remédios gera auditoria (ação + recurso + id).
3. Logger de aplicação redige campos sensíveis (`senha`, `email`, tokens, dados clínicos).
4. Seeds **não** incluem dados clínicos reais de pacientes.

---

## 4. Fora de escopo (v1 API)

- Prontuário eletrônico completo do paciente
- Telemedicina / vídeo
- Prescrição eletrônica assinada
- App mobile-first legado (`index.html` / `localStorage`) — permanece como protótipo histórico

---

## 5. Critérios de aceite (SDD)

- [ ] Schema MySQL aplicável em `database/schema.sql`
- [ ] `POST /api/v1/auth/login` retorna token + menus
- [ ] `GET /api/v1/menus/me` exige Bearer e filtra por perfil
- [ ] CRUDs de remédios, médicos, usuários e perfis protegidos
- [ ] Tela de Login React consome a API com validação e estado de loading
- [ ] Variáveis documentadas em `.env.example`
