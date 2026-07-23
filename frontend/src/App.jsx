import { useState } from 'react';
import Login from './pages/Login';

export default function App() {
  const [session, setSession] = useState(null);

  if (session) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-3xl border border-[#d7e8e7] bg-white p-8 shadow-panel">
          <p className="text-xs font-bold uppercase tracking-wider text-aqua">
            Sessão autenticada
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold text-ink">
            Olá, {session.usuario?.nome}
          </h1>
          <p className="mt-2 text-sm text-slate-health">
            Perfil: {session.usuario?.perfil?.nome}. Menus liberados:{' '}
            {(session.menus || []).length}.
          </p>
          <ul className="mt-5 grid gap-2">
            {(session.menus || []).map((menu) => (
              <li
                key={menu.id}
                className="rounded-xl border border-[#e2eeee] bg-[#f8fcfc] px-3 py-2 text-sm"
              >
                {menu.titulo}
                <span className="ml-2 text-xs text-slate-health">{menu.rota}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-6 rounded-xl border border-aqua px-4 py-2 text-sm font-semibold text-aqua hover:bg-aqua-soft"
            onClick={() => {
              localStorage.removeItem('vitalink.token');
              localStorage.removeItem('vitalink.usuario');
              localStorage.removeItem('vitalink.menus');
              setSession(null);
            }}
          >
            Sair
          </button>
        </div>
      </main>
    );
  }

  return <Login onSuccess={setSession} />;
}
