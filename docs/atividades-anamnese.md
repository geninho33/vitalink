# Atividades, Anamnese e Admin — notas SDD

## Schema
- `database/patch_atividades_anamnese.sql`
- Tabelas: `consultas`, `atendimentos_rotina`, `atendimento_execucoes`, `agenda_eventos`, `paciente_anamnese`

## Sincronização da Agenda
- Toda consulta criada/atualizada gera/atualiza `agenda_eventos` (origem `consultas`).
- Toda execução de rotina gera evento (origem `atendimento_execucoes`).
- Service: `backend/src/services/agenda.service.js`

## Menu
Dashboard → Saúde → **Atividades** → Administração (último)

## Mobile
- Listagens em cards no breakpoint `md`
- Botões de confirmação de dose com `min-h-14`
- Sidebar drawer já existente no AppShell
