'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { EmailOtpType, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('Preparing your secure password link...');
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function preparePasswordSession() {
      try {
        const currentUrl = new URL(window.location.href);
        const linkError = currentUrl.searchParams.get('error_description');
        if (linkError) throw new Error(decodeURIComponent(linkError.replace(/\+/g, ' ')));

        const code = currentUrl.searchParams.get('code');
        const tokenHash = currentUrl.searchParams.get('token_hash');
        const type = currentUrl.searchParams.get('type') as EmailOtpType | null;

        let session: Session | null = null;
        const initialSession = await supabase.auth.getSession();
        if (initialSession.error) throw initialSession.error;
        session = initialSession.data.session;

        if (!session && tokenHash && type) {
          const verified = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          if (verified.error) throw verified.error;
          session = verified.data.session;
        }

        // createBrowserClient can exchange a PKCE code during initialisation.
        // Only exchange it ourselves when that did not already create a session.
        if (!session && code) {
          const exchanged = await supabase.auth.exchangeCodeForSession(code);
          if (exchanged.error) throw exchanged.error;
          session = exchanged.data.session;
        }

        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const accessToken = hash.get('access_token');
        const refreshToken = hash.get('refresh_token');

        if (!session && accessToken && refreshToken) {
          const recovered = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (recovered.error) throw recovered.error;
          session = recovered.data.session;
        }

        if (!session) {
          throw new Error('This password link is invalid or has expired. Return to Sign in and request a new reset email.');
        }

        window.history.replaceState({}, '', currentUrl.pathname);

        if (active) {
          setReady(true);
          setMessage('Create a new password for your Isitha Staff Portal account.');
        }
      } catch (error) {
        if (active) {
          setReady(false);
          const detail = error instanceof Error ? error.message : 'Unable to open this password link.';
          setMessage(`${detail} Please use only the newest reset email.`);
        }
      }
    }

    preparePasswordSession();
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

    setMessage('Password updated. Opening your staff portal...');
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

          <h1 style={{ marginBottom: 8, color: 'var(--isitha-navy)' }}>Create a new password</h1>
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
                {loading ? 'Creating password...' : 'Save password & continue'}
              </button>
            </form>
          )}

          {!ready && message && <p className="warn" style={{ marginTop: 18 }}>{message}</p>}
        </div>
      </section>
    </main>
  );
}
