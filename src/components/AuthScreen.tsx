import { useState } from 'react';
import { Linkedin, Loader2 } from 'lucide-react';

export default function AuthScreen({ onReady }: { onReady: (email: string) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(mode === 'register' ? '/api/auth/register' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Could not sign in');
      onReady(data.user.email);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-white text-gray-900 p-6">
      <div className="w-full max-w-sm space-y-4">
        <div className="flex items-center gap-2 text-[#0077b5] font-bold uppercase tracking-wider text-xs">
          <Linkedin className="w-4 h-4" />
          LinkedIn Boss
        </div>
        <h1 className="text-2xl font-extrabold">{mode === 'register' ? 'Create your account' : 'Sign in'}</h1>
        <p className="text-xs text-gray-500">
          Sign in, then connect LinkedIn with a Cookie-Editor export (li_at + JSESSIONID). Extract contacts pulls your real 1st-degree list. A profile URL will not load your 2,500 connections.
        </p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="w-full p-2.5 text-sm border border-gray-300"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (8+ characters)"
          className="w-full p-2.5 text-sm border border-gray-300"
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="w-full py-3 bg-[#0077b5] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {mode === 'register' ? 'Create account' : 'Sign in'}
        </button>
        <button
          type="button"
          className="w-full text-xs text-[#0077b5]"
          onClick={() => setMode(mode === 'register' ? 'login' : 'register')}
        >
          {mode === 'register' ? 'Already have an account? Sign in' : 'Need an account? Register'}
        </button>
      </div>
    </div>
  );
}
