import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DateBrInput } from '../components/forms/FormControls';
import { useAuth } from '../context/AuthContext';
import { usePacienteAtivo } from '../context/PacienteAtivoContext';
import { isValidCpf, maskCpf, onlyDigits } from '../hooks/useCep';
import { onboardingRequest } from '../services/api';

const emptyPaciente = () => ({ nome: '', data_nascimento: '', cpf: '', telefone: '' });

export default function OnboardingPage() {
  const { usuario, refreshSession, switchContext } = useAuth();
  const { reload } = usePacienteAtivo();
  const navigate = useNavigate();
  const [tipo, setTipo] = useState('');
  const [dados, setDados] = useState({
    nome: usuario?.nome || '',
    cpf: '',
    telefone: '',
    grau_parentesco: '',
    turno: '',
  });
  const [pacientes, setPacientes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const perfilId = Number(usuario?.perfil?.id || usuario?.perfil_id);
    if (perfilId === 4) setTipo('cuidador');
    if (perfilId === 5) setTipo('responsavel');
    setPacientes((prev) => (prev.length ? prev : [emptyPaciente()]));
  }, [usuario?.perfil?.id, usuario?.perfil_id]);

  function addPaciente() {
    if (pacientes.length >= 2) return;
    setPacientes((prev) => [...prev, emptyPaciente()]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!tipo) {
      setError('Escolha se você é cuidador ou responsável.');
      return;
    }
    if (!isValidCpf(dados.cpf)) {
      setError('CPF inválido.');
      return;
    }
    if (pacientes.some((p) => p.cpf && !isValidCpf(p.cpf))) {
      setError('Há um CPF de paciente inválido.');
      return;
    }
    if (!pacientes.some((p) => p.nome && p.data_nascimento && p.cpf)) {
      setError('Cadastre ao menos um paciente para continuar.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await onboardingRequest({
        tipo,
        dados,
        pacientes: pacientes.filter((p) => p.nome && p.data_nascimento && p.cpf),
      });
      await refreshSession();
      await reload();
      await switchContext({
        perfil_id: res.perfil_id,
        paciente_id: res.pacientes?.[0]?.id || null,
      }).catch(() => {});
      navigate('/inicio', { replace: true });
    } catch (err) {
      setError(err.message || 'Não foi possível concluir o cadastro.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7F9F6] px-5 py-10">
      <div className="mx-auto w-full max-w-2xl rounded-3xl border border-[#d0e4ef] bg-white p-7 shadow-panel">
        <p className="text-xs font-bold uppercase tracking-wider text-vita">Primeiro acesso</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-ink">Como você vai usar o VitaLink?</h1>
        <p className="mt-1 text-sm text-slate-health">
          Escolha seu perfil. Você pode cadastrar até 2 pacientes agora.
        </p>

        <form className="mt-6 grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { id: 'cuidador', title: 'Cuidador', desc: 'Acompanho rotinas e cuidados no dia a dia.' },
              { id: 'responsavel', title: 'Responsável', desc: 'Sou familiar ou responsável legal.' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTipo(opt.id)}
                className={`rounded-2xl border p-4 text-left transition ${
                  tipo === opt.id
                    ? 'border-vita bg-vita-soft ring-2 ring-vita/20'
                    : 'border-[#d7e8e7] hover:border-vita/40'
                }`}
              >
                <strong className="text-ink">{opt.title}</strong>
                <p className="mt-1 text-sm text-slate-health">{opt.desc}</p>
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">Seu nome</span>
              <input
                required
                className="min-h-11 rounded-xl border border-[#cfe0df] px-3"
                value={dados.nome}
                onChange={(e) => setDados({ ...dados, nome: e.target.value })}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">CPF</span>
              <input
                required
                inputMode="numeric"
                className="min-h-11 rounded-xl border border-[#cfe0df] px-3"
                value={maskCpf(dados.cpf)}
                onChange={(e) => setDados({ ...dados, cpf: onlyDigits(e.target.value).slice(0, 11) })}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">Telefone</span>
              <input
                required
                className="min-h-11 rounded-xl border border-[#cfe0df] px-3"
                value={dados.telefone}
                onChange={(e) => setDados({ ...dados, telefone: e.target.value })}
              />
            </label>
            {tipo === 'responsavel' ? (
              <label className="grid gap-1 text-sm">
                <span className="font-semibold">Parentesco</span>
                <input
                  className="min-h-11 rounded-xl border border-[#cfe0df] px-3"
                  value={dados.grau_parentesco}
                  onChange={(e) => setDados({ ...dados, grau_parentesco: e.target.value })}
                />
              </label>
            ) : (
              <label className="grid gap-1 text-sm">
                <span className="font-semibold">Turno (opcional)</span>
                <input
                  className="min-h-11 rounded-xl border border-[#cfe0df] px-3"
                  value={dados.turno}
                  onChange={(e) => setDados({ ...dados, turno: e.target.value })}
                />
              </label>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-health">
                Paciente inicial (obrigatório)
              </h2>
              <button
                type="button"
                disabled={pacientes.length >= 2}
                onClick={addPaciente}
                className="text-sm font-semibold text-vita disabled:opacity-40"
              >
                + Adicionar
              </button>
            </div>
            {pacientes.map((p, idx) => (
              <div key={idx} className="mb-3 grid gap-2 rounded-2xl border border-[#e2eeee] p-3 sm:grid-cols-2">
                <input
                  placeholder="Nome"
                  className="min-h-11 rounded-xl border border-[#cfe0df] px-3"
                  value={p.nome}
                  onChange={(e) =>
                    setPacientes((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, nome: e.target.value } : x))
                    )
                  }
                />
                <DateBrInput
                  placeholder="Nascimento DD/MM/AAAA"
                  value={p.data_nascimento}
                  onChange={(data_nascimento) =>
                    setPacientes((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, data_nascimento } : x))
                    )
                  }
                />
                <input
                  placeholder="CPF"
                  inputMode="numeric"
                  className="min-h-11 rounded-xl border border-[#cfe0df] px-3"
                  value={maskCpf(p.cpf)}
                  onChange={(e) =>
                    setPacientes((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, cpf: onlyDigits(e.target.value).slice(0, 11) } : x))
                    )
                  }
                />
                <input
                  placeholder="Telefone"
                  className="min-h-11 rounded-xl border border-[#cfe0df] px-3"
                  value={p.telefone}
                  onChange={(e) =>
                    setPacientes((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, telefone: e.target.value } : x))
                    )
                  }
                />
              </div>
            ))}
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={saving}
            className="h-12 rounded-xl bg-vita font-semibold text-white disabled:opacity-70"
          >
            {saving ? 'Salvando...' : 'Concluir e entrar'}
          </button>
        </form>
      </div>
    </main>
  );
}
