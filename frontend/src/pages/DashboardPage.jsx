import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PageHeader, { PlaceholderCard } from '../components/PageHeader';
import { apiRequest } from '../services/api';

export default function DashboardPage() {
  const { usuario, menus } = useAuth();
  const isAdmin = String(usuario?.perfil?.nome || '')
    .toLowerCase()
    .includes('admin');
  const [stats, setStats] = useState({
    pacientes: null,
    eventosHoje: null,
    loading: true,
  });

  useEffect(() => {
    if (!isAdmin) {
      setStats((s) => ({ ...s, loading: false }));
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [pac, agenda] = await Promise.all([
          apiRequest('/pacientes', { query: { status: 'ativo', pageSize: 1 } }).catch(() => null),
          apiRequest('/agenda', { query: { pageSize: 100 } }).catch(() => null),
        ]);
        if (cancelled) return;
        const today = new Date().toISOString().slice(0, 10);
        const eventos = (agenda?.data || []).filter((e) =>
          String(e.data_hora_inicio || e.data_hora || '').startsWith(today)
        );
        setStats({
          pacientes: pac?.pagination?.total ?? (pac?.data || []).length,
          eventosHoje: eventos.length,
          loading: false,
        });
      } catch {
        if (!cancelled) setStats((s) => ({ ...s, loading: false }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  if (isAdmin) {
    return (
      <div>
        <PageHeader
          title="Dashboard operacional"
          description="Supervisão global do VitaLink — pacientes, eventos e acessos."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <PlaceholderCard>
            <p className="text-xs font-bold uppercase tracking-wider text-aqua">Pacientes ativos</p>
            <p className="mt-2 text-3xl font-bold text-ink">
              {stats.loading ? '…' : stats.pacientes ?? '—'}
            </p>
            <Link to="/pacientes" className="mt-2 inline-block text-sm font-semibold text-aqua hover:underline">
              Abrir cadastro
            </Link>
          </PlaceholderCard>
          <PlaceholderCard>
            <p className="text-xs font-bold uppercase tracking-wider text-aqua">Eventos de hoje</p>
            <p className="mt-2 text-3xl font-bold text-ink">
              {stats.loading ? '…' : stats.eventosHoje ?? '—'}
            </p>
            <Link to="/agenda" className="mt-2 inline-block text-sm font-semibold text-aqua hover:underline">
              Ver agenda
            </Link>
          </PlaceholderCard>
          <PlaceholderCard>
            <p className="text-xs font-bold uppercase tracking-wider text-aqua">Menus liberados</p>
            <p className="mt-2 text-3xl font-bold text-ink">{menus.length}</p>
            <p className="mt-1 text-sm text-slate-health">Escopo Admin — supervisão total</p>
          </PlaceholderCard>
          <PlaceholderCard>
            <p className="text-xs font-bold uppercase tracking-wider text-aqua">Auditoria</p>
            <p className="mt-2 text-sm text-slate-health">
              Log de rastreabilidade: ID, usuário, ação, data/hora e alteração (diff sanitizado).
            </p>
            <Link to="/auditoria" className="mt-2 inline-block text-sm font-semibold text-aqua hover:underline">
              Abrir trilha
            </Link>
          </PlaceholderCard>
          <PlaceholderCard>
            <p className="text-xs font-bold uppercase tracking-wider text-aqua">Sessão</p>
            <p className="mt-2 text-lg font-semibold text-ink">{usuario?.perfil?.nome}</p>
            <p className="mt-1 text-sm text-slate-health">{usuario?.email}</p>
            <p className="mt-2 text-xs text-slate-health">
              Profile Switch (uso pessoal) será liberado na próxima onda de identidade.
            </p>
          </PlaceholderCard>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Olá, ${usuario?.nome?.split(' ')[0] || 'bem-vindo'}`}
        description="Acompanhe rotinas de cuidado, acessos e indicadores do VitaLink."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <PlaceholderCard>
          <p className="text-xs font-bold uppercase tracking-wider text-aqua">Perfil</p>
          <p className="mt-2 text-lg font-semibold text-ink">{usuario?.perfil?.nome}</p>
          <p className="mt-1 text-sm text-slate-health">{usuario?.email}</p>
        </PlaceholderCard>
        <PlaceholderCard>
          <p className="text-xs font-bold uppercase tracking-wider text-aqua">Menus liberados</p>
          <p className="mt-2 text-3xl font-bold text-ink">{menus.length}</p>
          <p className="mt-1 text-sm text-slate-health">Itens retornados por /menus/me</p>
        </PlaceholderCard>
        <PlaceholderCard>
          <p className="text-xs font-bold uppercase tracking-wider text-aqua">Atalho</p>
          <Link to="/inicio" className="mt-2 inline-block text-sm font-semibold text-aqua hover:underline">
            Ir para Início
          </Link>
        </PlaceholderCard>
      </div>
    </div>
  );
}
