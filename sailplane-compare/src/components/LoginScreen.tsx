import { useState } from 'react';

export type UserTier = 'private' | 'public';

interface Props {
  onLogin: (tier: UserTier) => void;
}

export function LoginScreen({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const privateUser = import.meta.env.VITE_AUTH_USERNAME ?? 'plozzers';
    const privatePass = import.meta.env.VITE_AUTH_PASSWORD ?? 'H201Libelle';

    if (username === privateUser && password === privatePass) {
      sessionStorage.setItem('spade_auth', 'private');
      onLogin('private');
    } else if (username === 'cumulus' && password === 'humilis') {
      sessionStorage.setItem('spade_auth', 'public');
      onLogin('public');
    } else {
      setError(true);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-white p-8 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">SPADE</h1>
          <p className="text-sm text-slate-500">Sailplane Performance Analysis Database</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              autoFocus
              onChange={(e) => { setUsername(e.target.value); setError(false); }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">Invalid username or password.</p>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
