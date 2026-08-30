import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DateBrInput } from '../components/forms/FormControls';
import { isValidCpf, isValidEmail, maskCpf, maskPhone, onlyDigits } from '../hooks/useCep';
import { registroRequest } from '../services/api';
import { isAdult, isValidPhone, PASSWORD_HINT, validateStrongPassword } from '../utils/validation';

export default function Registro() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!isValidEmail(email)) {
      setError('E-mail inválido.');
      return;
    }
    if (!isValidCpf(cpf)) {
      setError('CPF inválido.');
      return;
    }
    if (!isValidPhone(telefone)) {
      setError('Informe um telefone válido com DDD.');
      return;
    }
    if (!isAdult(dataNascimento)) {
      setError('Cadastro restrito a maiores de 18 anos. Menores de idade não podem criar conta.');
      return;
    }
    const senhaMsg = validateStrongPassword(senha);
    if (senhaMsg) {
      setError(senhaMsg);
      return;
    }
    setLoading(true);
    try {
      const res = await registroRequest({
        nome: nome.trim(),
        email: email.trim(),
        senha,
        cpf: onlyDigits(cpf),
        data_nascimento: dataNascimento,
        telefone: onlyDigits(telefone),
      });
      setDone(res);
    } catch (err) {
      setError(err.message || 'Não foi possível criar a conta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F9F6] px-5 py-10">
      <div className="w-full max-w-md rounded-3xl border border-[#d0e4ef] bg-[#F7F9F6] p-7 shadow-panel">
        <h1 className="font-display text-2xl font-bold text-ink">Criar conta</h1>
        <p className="mt-1 text-sm text-slate-health">
          Após o cadastro você já pode entrar. Acesso permitido apenas a maiores de 18 anos.
        </p>

        {done ? (
          <div className="mt-6 grid gap-3">
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
              {done.message}
            </p>
            <Link to="/login" className="text-sm font-semibold text-vita hover:underline">
              Entrar agora
            </Link>
          </div>
        ) : (
          <form className="mt-6 grid gap-3" onSubmit={handleSubmit}>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-ink">Nome</span>
              <input
                required
                className="min-h-11 rounded-xl border border-[#cfe0df] px-3"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-ink">E-mail</span>
              <input
                type="email"
                required
                className="min-h-11 rounded-xl border border-[#cfe0df] px-3"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-ink">CPF</span>
              <input
                required
                inputMode="numeric"
                className="min-h-11 rounded-xl border border-[#cfe0df] px-3"
                value={maskCpf(cpf)}
                onChange={(e) => setCpf(onlyDigits(e.target.value).slice(0, 11))}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-ink">Telefone</span>
              <input
                required
                type="tel"
                inputMode="numeric"
                className="min-h-11 rounded-xl border border-[#cfe0df] px-3"
                value={maskPhone(telefone)}
                onChange={(e) => setTelefone(onlyDigits(e.target.value).slice(0, 11))}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-ink">Data de nascimento</span>
              <DateBrInput required value={dataNascimento} onChange={setDataNascimento} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-ink">Senha</span>
              <input
                type="password"
                required
                minLength={8}
                className="min-h-11 rounded-xl border border-[#cfe0df] px-3"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
              <span className="text-xs text-slate-health">{PASSWORD_HINT}</span>
            </label>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="h-12 rounded-xl bg-vita font-semibold text-white disabled:opacity-70"
            >
              {loading ? 'Enviando...' : 'Cadastrar'}
            </button>
            <Link to="/login" className="text-center text-sm text-slate-health hover:underline">
              Já tenho conta
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}
