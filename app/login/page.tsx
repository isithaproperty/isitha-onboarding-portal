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

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  }

  return (
    <main className="shell">
      <section
        style={{
          maxWidth: 460,
          margin: '80px auto',
        }}
      >
        <div className="card">
          <div style={{ marginBottom: 24 }}>
            <strong style={{ fontSize: 22 }}>
              ISITHA GLOBAL
            </strong>

            <div className="muted" style={{ marginTop: 4 }}>
              Staff Onboarding & Compliance Portal
            </div>
          </div>

          <h1 style={{ marginBottom: 8 }}>
            Sign in
          </h1>

          <p className="muted">
            Enter your Isitha employee login details.
          </p>

          <form
            onSubmit={handleLogin}
            style={{
              display: 'grid',
              gap: 18,
              marginTop: 24,
            }}
          >
            <div>
              <label
                htmlFor="email"
                style={{
                  display: 'block',
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                Email address
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 16,
                }}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                style={{
                  display: 'block',
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 16,
                }}
              />
            </div>

            <button
              type="submit"
              className="button"
              disabled={loading}
              style={{
                border: 0,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {message && (
            <p
              className="warn"
              style={{ marginTop: 18 }}
            >
              {message}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
