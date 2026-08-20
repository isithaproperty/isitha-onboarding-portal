'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('Preparing your invitation...');
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function prepareInviteSession() {
      try {
        const currentUrl = new URL(window.location.href);
        const code = currentUrl.searchParams.get('code');

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          currentUrl.searchParams.delete('code');
          window.history.replaceState({}, '', currentUrl.pathname + currentUrl.search);
        }

        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const accessToken = hash.get('access_token');
        const refreshToken = hash.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
          window.history.replaceState({}, '', currentUrl.pathname + currentUrl.search);
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) {
          throw new Error('This invitation link is invalid or has expired. Please ask HR to send a new invitation.');
        }

        if (active) {
          setReady(true);
          setMessage('Create a password for your Isitha Staff Portal account.');
        }
      } catch (error) {
        if (active) {
          setReady(false);
          setMessage(error instanceof Error ? error.message : 'Unable to open this invitation.');
        }
      }
    }

    prepareInviteSession();
    return () => { active = false; };
  }, []);

  async function handleSetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');

    if (password.length < 8) {
      setMessage('Please choose a password with at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setMessage('The passwords do not match.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage('Password created. Opening your staff portal...');
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

          <h1 style={{ marginBottom: 8, color: 'var(--isitha-navy)' }}>Create your password</h1>
          <p className="muted">{message}</p>

          {ready && (
            <form onSubmit={handleSetPassword} className="login-form">
              <div className="login-field">
                <label htmlFor="password">New password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>

              <div className="login-field">
                <label htmlFor="confirmPassword">Confirm password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                className="button"
                disabled={loading}
                style={{ cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
              >
                {loading ? 'Creating password...' : 'Create password & continue'}
              </button>
            </form>
          )}

          {!ready && message && <p className="warn" style={{ marginTop: 18 }}>{message}</p>}
        </div>
      </section>
    </main>
  );
}
