-- =============================================================================
-- VitaLink — Placeholder initdb para massa de dados (PostgreSQL)
-- =============================================================================
-- A carga completa de dados sintéticos (LGPD) é feita pelo seeder Node.js:
--
--   docker compose exec vitalink-backend node src/seeds/runSeeds.js
--   ./deploy.sh seed
--   cd backend && npm run db:seed
--
-- Este arquivo NÃO popula automaticamente o banco no first-boot do Postgres
-- (evita massa pesada em todo volume novo). Use a flag seed sob demanda.
--
-- Volumetria do seeder:
--   5 hospitais, 5 farmácias, 15 remédios, 20 médicos, 10 cuidadores,
--   30 responsáveis, 20 pacientes (+ anamnese), >=40 consultas,
--   rotinas/execuções e sincronização em agenda_eventos.
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE 'VitaLink: para popular massa sintética execute ./deploy.sh seed';
END $$;
