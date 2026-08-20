'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="card">
          <div className="login-brand">
            <img src="/isitha-global-logo.webp" alt="Isitha Global" />
            <strong>Staff Portal</strong>
            <span>Onboarding, contracts, leave & compliance</span>
          </div>

          <h1 style={{ marginBottom: 8, color: 'var(--isitha-navy)' }}>Sign in</h1>
          <p className="muted">Enter your Isitha employee login details.</p>

          <form onSubmit={handleLogin} className="login-form">
            <div className="login-field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="button" disabled={loading} style={{ cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {message && <p className="warn" style={{ marginTop: 18 }}>{message}</p>}
        </div>
      </section>
    </main>
  );
}
