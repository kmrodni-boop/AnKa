import React from 'react';
import { toast } from 'react-hot-toast';
import { setSession } from '../session';

const DEMO_ACCOUNTS = [
  { label: 'Admin', username: 'admin', password: 'admin' },
  { label: 'Leder', username: 'leder', password: 'leder123' },
  { label: 'Koordinator', username: 'koordinator', password: 'koordinator123' },
  { label: 'Tekniker (Ola Nordmann)', username: 'ola.nordmann', password: 'tekniker123' }
];

export default function Login({ onLogin }) {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [showDemoAccounts, setShowDemoAccounts] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Kunne ikke logge inn');
        return;
      }

      setSession(data.token, data.user);
      toast.success(`Velkommen, ${data.user.name}!`);
      onLogin(data.user);
    } catch (error) {
      toast.error('Feil ved innlogging');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (account) => {
    setUsername(account.username);
    setPassword(account.password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#520000] to-[#3a0000] p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Nortronik AnKa</h1>
          <p className="text-red-100 mt-1">Arbeidsordre & Planlegging</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brukernavn</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                autoCapitalize="none"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#520000] focus:border-transparent text-base"
                placeholder="f.eks. admin"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Passord</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#520000] focus:border-transparent text-base"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-[#520000] hover:bg-[#3a0000] disabled:bg-[#8a4a4a] text-white rounded-xl font-semibold transition-colors shadow-sm"
            >
              {loading ? 'Logger inn...' : 'Logg inn'}
            </button>
          </form>

          <button
            onClick={() => setShowDemoAccounts(!showDemoAccounts)}
            className="w-full text-center text-xs text-gray-400 hover:text-gray-600 mt-4"
          >
            {showDemoAccounts ? 'Skjul demo-kontoer' : 'Vis demo-kontoer'}
          </button>

          {showDemoAccounts && (
            <div className="mt-3 space-y-1 border-t pt-3">
              {DEMO_ACCOUNTS.map(account => (
                <button
                  key={account.username}
                  onClick={() => fillDemoAccount(account)}
                  className="w-full flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"
                >
                  <span>{account.label}</span>
                  <span className="text-gray-400">{account.username}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
