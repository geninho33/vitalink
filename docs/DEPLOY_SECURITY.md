# Guia de Deployment - Correções de Segurança VitaLink

**Data:** 09 de outubro de 2026  
**Versão:** 1.1.0 - Security Hardening

## ⚠️ AÇÕES OBRIGATÓRIAS ANTES DO DEPLOY

### 1. Atualizar Variáveis de Ambiente

**CRÍTICO:** O sistema NÃO iniciará sem as seguintes variáveis configuradas:

#### 1.1. Gerar JWT_SECRET Forte

```bash
openssl rand -base64 48
```

Adicionar ao `.env`:
```env
JWT_SECRET=<valor_gerado_acima>
```

**Requisitos:**
- Mínimo 32 caracteres
- NUNCA usar valores de exemplo ou padrão
- ⚠️ **AVISO:** Trocar este valor invalida todos os JWTs ativos (logout forçado de todos os usuários)

#### 1.2. Gerar DB_PASSWORD Forte

```bash
openssl rand -base64 24
```

Adicionar ao `.env`:
```env
DB_PASSWORD=<valor_gerado_acima>
```

#### 1.3. Configurar CORS_ORIGIN

**Produção:**
```env
CORS_ORIGIN=https://homolog.vitalink.app.br
```

**Múltiplas origens** (separar por vírgula):
```env
CORS_ORIGIN=https://homolog.vitalink.app.br,https://app.vitalink.app.br
```

**⚠️ NUNCA use wildcard (`*`) em produção!**

### 2. Aplicar Patch SQL de Segurança

O patch `database/patch_security_2026_10_09.sql` será aplicado automaticamente no boot se `RUN_MIGRATIONS=true`.

**O que o patch faz:**
- Adiciona campo `paciente_id` na tabela `arquivos`
- Cria constraints `UNIQUE` em:
  - `usuarios.email`
  - `usuarios.cpf`
  - `pacientes.cpf`
  - `responsaveis.cpf`
  - `medicos.crm` + `uf`
  - `paciente_cuidador_vinculos.paciente_id` + `cuidador_id`
  - `paciente_responsaveis.paciente_id` + `responsavel_id`
- Adiciona permissões RBAC para perfis Paciente (6) e Autocuidado (7)

**⚠️ AVISO:** Se houver dados duplicados, o patch registra um WARNING e pula a constraint. Verifique os logs após o deploy:

```bash
docker-compose logs vitalink-backend | grep WARNING
```

Para listar duplicatas antes do deploy:
```sql
-- Emails duplicados
SELECT email, COUNT(*) FROM usuarios GROUP BY email HAVING COUNT(*) > 1;

-- CPFs duplicados em pacientes
SELECT cpf, COUNT(*) FROM pacientes WHERE cpf IS NOT NULL GROUP BY cpf HAVING COUNT(*) > 1;
```

### 3. Atualizar Configuração do Nginx (Frontend)

Se a API estiver atrás de nginx do host, adicionar no `nginx.conf`:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3002;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**Importante:** O backend está configurado com `trust proxy: true` para identificar IP real do cliente através do nginx.

---

## 📋 Checklist de Deploy

### Pré-Deploy
- [ ] Variável `JWT_SECRET` configurada (≥32 caracteres)
- [ ] Variável `DB_PASSWORD` configurada (forte)
- [ ] Variável `CORS_ORIGIN` configurada (SEM wildcard `*`)
- [ ] Backup do banco de dados criado
- [ ] Backup dos uploads (`/var/lib/docker/volumes/vitalink_uploads`) criado
- [ ] Comunicado aos usuários sobre possível logout forçado

### Deploy
- [ ] `git pull origin dev`
- [ ] `cd deploy && docker-compose down`
- [ ] `docker-compose build --no-cache`
- [ ] `docker-compose up -d`
- [ ] Aguardar healthcheck: `docker-compose ps`

### Pós-Deploy
- [ ] Verificar logs do backend: `docker-compose logs -f vitalink-backend`
- [ ] Verificar se patch SQL foi aplicado: buscar "Constraint UNIQUE" nos logs
- [ ] Testar login na aplicação
- [ ] Testar upload de arquivo
- [ ] Testar acesso a arquivo existente (deve pedir autenticação)
- [ ] Verificar rate limiting: fazer 6 tentativas de login inválidas (deve bloquear na 6ª)

---

## 🔐 Mudanças de Segurança Implementadas

### 1. Rate Limiting
- **Global:** 100 requisições por IP a cada 15 minutos
- **Login:** 5 tentativas a cada 15 minutos (apenas falhas são contadas)
- **Registro/Recuperação de Senha:** 3 tentativas por hora

### 2. Correções IDOR
Verificação de escopo adicionada em:
- `PUT /api/v1/consultas/:id` - Verifica acesso ao paciente antes de atualizar
- `DELETE /api/v1/consultas/:id` - Verifica acesso ao paciente antes de deletar
- Outros endpoints de dados de pacientes aplicam escopo via `crudFactory`

### 3. Uploads Protegidos
- `/uploads/*` agora requer autenticação (removido `express.static`)
- Validação de magic bytes (tipo real do arquivo)
- Verificação de escopo: apenas dono ou usuários com acesso ao paciente podem baixar
- Path traversal prevenido (validação de `..`, `/`, `\`)
- UPLOAD_DIR validado em produção (deve estar em `/app/uploads`)

### 4. RBAC em Dados
- Permissões de Paciente/Autocuidado movidas para `permissoes_acesso` (tabela)
- Removido hard-code do middleware `rbac.js`

### 5. Constraints UNIQUE
- Email, CPF, CRM+UF agora são únicos no banco
- Vínculos duplicados prevenidos

### 6. Segredos Obrigatórios
- `JWT_SECRET` e `DB_PASSWORD` sem valores padrão
- CORS_ORIGIN sem fallback para `*`
- Sistema recusa iniciar em produção com valores inseguros

### 7. Headers de Segurança
- CSP (Content-Security-Policy) configurado
- Trust proxy habilitado para identificar IP real

### 8. Dependências Atualizadas
- `@faker-js/faker` atualizado para 10.6.0 (corrige CVE de RCE)
- Movido para `devDependencies` (apenas usado em seeds)

---

## 🧪 Testes

Execute os testes de segurança:

```bash
cd backend
npm run test:security
```

Testes implementados:
- Rate limiting (global e por endpoint)
- IDOR (verificação de escopo)
- Upload (validação de filename e magic bytes)

---

## 7. **Senha do PostgreSQL: ALTER USER**

Como o volume do PostgreSQL (`vitalink_pg_data`) já existe, trocar a variável `DB_PASSWORD` no `.env` **NÃO altera a senha do banco automaticamente**.

**Procedimento correto:**

1. **Definir nova senha no `.env`:**
   ```env
   DB_PASSWORD=<nova_senha_forte>
   ```

2. **Conectar ao banco com a senha ANTIGA** e executar ALTER USER:
   ```bash
   # Conectar ao container do banco
   docker exec -it vitalink-db psql -U vitalink vitalink
   
   # Dentro do psql:
   ALTER USER vitalink WITH PASSWORD '<nova_senha_forte>';
   \q
   ```

3. **Reiniciar o backend:**
   ```bash
   docker-compose restart vitalink-backend
   ```

4. **Verificar se backend conecta com sucesso:**
   ```bash
   docker-compose logs vitalink-backend | grep "conectado\|connected\|error"
   ```

**⚠️ IMPORTANTE:** Nunca execute comandos SQL com senhas reais em logs públicos ou documentação versionada. Use sempre placeholders.

---

Em caso de problemas no deploy:

1. **Erro: JWT_SECRET não definido**
   - Configure no `.env` com valor forte (≥32 caracteres)

2. **Erro: CORS_ORIGIN não definido**
   - Configure no `.env` com origem explícita (ex.: `https://homolog.vitalink.app.br`)

3. **Erro: DB_PASSWORD não definido**
   - Configure no `.env` com senha forte

4. **Usuários não conseguem fazer login após deploy**
   - Esperado se `JWT_SECRET` foi trocado. Todos devem fazer login novamente.

5. **Arquivos antigos não carregam**
   - Arquivos antigos sem `paciente_id` são acessíveis apenas pelo dono
   - Considere executar script de migração para vincular arquivos a pacientes

6. **Warnings sobre duplicatas no log**
   - Verificar dados duplicados e decidir se deduplica ou mantém sem constraint

---

## 🔄 Rollback

Se houver problemas críticos:

1. Restaurar versão anterior:
   ```bash
   git checkout <commit-anterior>
   docker-compose down
   docker-compose up -d --build
   ```

2. Restaurar backup do banco:
   ```bash
   docker exec -i vitalink-db psql -U vitalink vitalink < backup.sql
   ```

**Nota:** Rollback após aplicar patch SQL pode requerer reverter manualmente as constraints criadas.

## 📞 Suporte
