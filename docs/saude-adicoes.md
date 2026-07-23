# Adições automáticas — Módulo Saúde (SDD)

Além dos campos exigidos na especificação, foram acrescentados para integridade e conformidade:

| Entidade | Campos adicionados | Motivo |
|----------|-------------------|--------|
| Todas (saúde) | `status` (ativo/inativo) | Soft-disable operacional |
| Todas | `created_at` / `updated_at` | Auditoria temporal |
| Pacientes | `foto_url`, `convenio_nome`, `convenio_numero`, `convenio_validade`, `telefone_principal`, `email`, endereço opcional, `observacoes` | Perfil clínico completo e convênio |
| Cuidadores / Responsáveis | `foto_url`, `observacoes`, `status` | Identidade visual e operação |
| Hospitais / Farmácias | `tipo_documento`, `observacoes`, `status` | CNPJ/CPF e anotações |
| Médicos | endereço opcional, `telefone_secundario`, `status`, `hospital_clinica_id` obrigatório | Vínculo institucional |
| Remédios | `status` | Catálogo ativo/inativo |

**Script aplicado:** `database/patch_saude_modulos.sql`
