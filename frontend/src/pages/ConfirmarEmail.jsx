import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { confirmarEmailRequest } from '../services/api';

export default function ConfirmarEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [status, setStatus] = useState(token ? 'loading' : 'missing');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    confirmarEmailRequest(token)
      .then((res) => {
        setStatus('ok');
        setMessage(res.message || 'E-mail confirmado.');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message || 'Link inválido ou expirado.');
      });
  }, [token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F9F6] px-5 py-10">
      <div className="w-full max-w-md rounded-3xl border border-[#d0e4ef] bg-[#F7F9F6] p-7 shadow-panel">
        <h1 className="font-display text-2xl font-bold text-ink">Confirmação de e-mail</h1>
        <p className="mt-4 text-sm text-slate-health">
          {status === 'loading' ? 'Validando...' : message || 'Token ausente.'}
        </p>
        {status !== 'loading' ? (
          <Link to="/login" className="mt-4 inline-block text-sm font-semibold text-vita hover:underline">
            Ir para o login
          </Link>
        ) : null}
      </div>
    </main>
  );
}
