import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DateBrInput } from '../components/forms/FormControls';
import { PacienteExistenteAviso, buscarPacientePorCpf } from '../components/VincularPacientePorCpf';
import { useAuth } from '../context/AuthContext';
import { usePacienteAtivo } from '../context/PacienteAtivoContext';
import { isValidCpf, maskCpf, onlyDigits } from '../hooks/useCep';
import { onboardingRequest } from '../services/api';

const emptyPaciente = () => ({
  nome: '',
  data_nascimento: '',
  cpf: '',
  telefone: '',
  paciente_id: null,
});

function PacienteSlot({ value, onChange, disableCpf }) {
  const [found, setFound] = useState(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const digits = onlyDigits(value.cpf);
    if (digits.length !== 11 || !isValidCpf(digits)) {
      setFound(null);
      setChecking(false);
      return undefined;
    }
    let cancelled = false;
    setChecking(true);
    buscarPacientePorCpf(digits)
      .then((row) => {
        if (cancelled) return;
        setFound(row);
        if (row) {
          onChange({
            ...value,
            paciente_id: row.id,
            nome: value.nome || row.nome || '',
            data_nascimento:
              value.data_nascimento ||
              (row.data_nascimento ? String(row.data_nascimento).slice(0, 10) : ''),
            telefone: value.telefone || row.telefone_principal || '',
          });
        } else {
          onChange({ ...value, paciente_id: null });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFound(null);
          onChange({ ...value, paciente_id: null });
        }
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
    // Só reconsulta quando o CPF muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.cpf]);

  return (
    <div className="mb-3 grid gap-2 rounded-2xl border border-[#e2eeee] p-3 sm:grid-cols-2">
      <input
        placeholder="Nome"
        className="min-h-11 rounded-xl border border-[#cfe0df] px-3"
        value={value.nome}
        onChange={(e) => onChange({ ...value, nome: e.target.value })}
      />
      <DateBrInput
        placeholder="Nascimento DD/MM/AAAA"
        value={value.data_nascimento}
        onChange={(data_nascimento) => onChange({ ...value, data_nascimento })}
      />
      <input
        placeholder="CPF"
        inputMode="numeric"
        disabled={disableCpf}
        className="min-h-11 rounded-xl border border-[#cfe0df] px-3 disabled:bg-slate-50"
        value={maskCpf(value.cpf)}
        onChange={(e) =>
          onChange({
            ...value,
            cpf: onlyDigits(e.target.value).slice(0, 11),
            paciente_id: null,
          })
        }
      />
      <input
        placeholder="Telefone"
        className="min-h-11 rounded-xl border border-[#cfe0df] px-3"
        value={value.telefone}
        onChange={(e) => onChange({ ...value, telefone: e.target.value })}
      />
      <div className="sm:col-span-2">
        <PacienteExistenteAviso found={found} checking={checking} />
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const { usuario, refreshSession, switchContext } = useAuth();
  const { reload } = usePacienteAtivo();
  const navigate = useNavigate();
  const [tipo, setTipo] = useState('');
  const [dados, setDados] = useState({
    nome: usuario?.nome || '',
    cpf: usuario?.cpf || '',
    telefone: '',
    grau_parentesco: '',
    turno: '',
    data_nascimento: usuario?.data_nascimento
      ? String(usuario.data_nascimento).slice(0, 10)
      : '',
  });
  const [pacientes, setPacientes] = useState([emptyPaciente()]);
  const [euTambemPaciente, setEuTambemPaciente] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const perfilId = Number(usuario?.perfil?.id || usuario?.perfil_id);
    if (perfilId === 4) setTipo('cuidador');
    if (perfilId === 5) setTipo('responsavel');
    if (perfilId === 7) setTipo('autocuidado');
    if (usuario?.cpf && !dados.cpf) {
      setDados((prev) => ({ ...prev, cpf: onlyDigits(usuario.cpf) }));
    }
  }, [usuario?.perfil?.id, usuario?.perfil_id, usuario?.cpf]);

  function addPaciente() {
    if (pacientes.length >= 2) return;
    setPacientes((prev) => [...prev, emptyPaciente()]);
  }

  function toggleEuPaciente(checked) {
    setEuTambemPaciente(checked);
    if (!checked) return;
    setPacientes((prev) => {
      const self = {
        nome: dados.nome,
        cpf: onlyDigits(dados.cpf),
        telefone: dados.telefone,
        data_nascimento: usuario?.data_nascimento
          ? String(usuario.data_nascimento).slice(0, 10)
          : prev[0]?.data_nascimento || '',
        paciente_id: null,
        eu_mesmo: true,
      };
      if (!prev.length) return [self];
      return [self, ...prev.slice(1).filter((p) => !p.eu_mesmo)];
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!tipo) {
      setError('Escolha se você é cuidador, responsável ou autocuidado.');
      return;
    }
    if (!isValidCpf(dados.cpf)) {
      setError('CPF inválido.');
      return;
    }
    if (tipo === 'autocuidado') {
      if (!dados.data_nascimento) {
        setError('Informe sua data de nascimento.');
        return;
      }
      setSaving(true);
      setError('');
      try {
        const res = await onboardingRequest({
          tipo,
          dados,
          pacientes: [],
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
      return;
    }
    if (pacientes.some((p) => p.cpf && !isValidCpf(p.cpf))) {
      setError('Há um CPF de paciente inválido.');
      return;
    }
    const prontos = pacientes.filter(
      (p) => p.paciente_id || (p.nome && p.data_nascimento && p.cpf)
    );
    if (!prontos.length) {
      setError('Cadastre ou vincule ao menos um paciente (pelo CPF) para continuar.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await onboardingRequest({
        tipo,
        dados,
        pacientes: prontos,
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
          Escolha seu perfil. Autocuidado gerencia só a sua saúde. Cuidador e responsável podem
          cadastrar ou vincular pacientes pelo CPF.
        </p>

        <form className="mt-6 grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { id: 'cuidador', title: 'Cuidador', desc: 'Acompanho rotinas e cuidados no dia a dia.' },
              { id: 'responsavel', title: 'Responsável', desc: 'Sou familiar ou responsável legal.' },
              {
                id: 'autocuidado',
                title: 'Autocuidado',
                desc: 'Uso pessoal: gerencio só a minha saúde.',
              },
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
            ) : tipo === 'cuidador' ? (
              <label className="grid gap-1 text-sm">
                <span className="font-semibold">Turno (opcional)</span>
                <input
                  className="min-h-11 rounded-xl border border-[#cfe0df] px-3"
                  value={dados.turno}
                  onChange={(e) => setDados({ ...dados, turno: e.target.value })}
                />
              </label>
            ) : (
              <label className="grid gap-1 text-sm">
                <span className="font-semibold">Data de nascimento</span>
                <DateBrInput
                  required={tipo === 'autocuidado'}
                  value={dados.data_nascimento}
                  onChange={(data_nascimento) => setDados({ ...dados, data_nascimento })}
                />
              </label>
            )}
          </div>

          {tipo !== 'autocuidado' ? (
          <label className="flex items-start gap-2 rounded-2xl border border-[#d7e8e7] bg-[#f8fcfc] px-3 py-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={euTambemPaciente}
              onChange={(e) => toggleEuPaciente(e.target.checked)}
            />
            <span>
              <strong className="text-ink">Eu também sou paciente</strong>
              <span className="mt-0.5 block text-slate-health">
                Usa o seu CPF para criar (ou vincular) a ficha de paciente, além do perfil de
                responsável/cuidador.
              </span>
            </span>
          </label>
          ) : (
            <p className="rounded-2xl border border-aqua/30 bg-aqua-soft px-3 py-3 text-sm text-aqua-deep">
              No autocuidado você é o titular e o paciente. Não é necessário vincular outras pessoas.
            </p>
          )}

          {tipo !== 'autocuidado' ? (
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
            <p className="mb-2 text-xs text-slate-health">
              Se o paciente já existe (ex.: Juarez), informe só o CPF — o sistema vincula a ficha em
              vez de cadastrar de novo.
            </p>
            {pacientes.map((p, idx) => (
              <PacienteSlot
                key={idx}
                value={p}
                disableCpf={Boolean(p.eu_mesmo)}
                onChange={(next) =>
                  setPacientes((prev) => prev.map((x, i) => (i === idx ? next : x)))
                }
              />
            ))}
          </div>
          ) : null}

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
