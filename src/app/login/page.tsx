'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(name.trim(), password);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <p style={styles.eyebrow}>MangaKo</p>
          <h1 style={styles.title}>Sign In</h1>
          <p style={styles.subtitle}>Welcome back to your reading desk</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form} noValidate>
          <div style={styles.field}>
            <label htmlFor="name" style={styles.label}>
              Reader Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your reader name"
              disabled={loading}
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="password" style={styles.label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              style={styles.input}
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              ...styles.submitBtn,
              opacity: loading ? 0.65 : 1,
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {/* Footer */}
        <p style={styles.footer}>
          Don&apos;t have an account?{' '}
          <Link href="/register" style={styles.link}>
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '24px 16px',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    background: 'var(--cream)',
    border: '1px solid var(--aged)',
    padding: '40px 36px',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '32px',
  },
  eyebrow: {
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: '0.65rem',
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
    color: 'var(--rust)',
    marginBottom: '8px',
  },
  title: {
    fontFamily: '"Playfair Display", Georgia, serif',
    fontSize: '2rem',
    fontWeight: 700,
    color: 'var(--ink)',
    marginBottom: '6px',
  },
  subtitle: {
    fontFamily: '"Noto Serif", Georgia, serif',
    fontSize: '0.9rem',
    color: 'var(--smoke)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  label: {
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: '0.65rem',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: 'var(--smoke)',
  },
  input: {
    border: '1px solid var(--aged)',
    padding: '10px 14px',
    fontSize: '0.95rem',
    fontFamily: '"Noto Serif", Georgia, serif',
    background: 'var(--cream)',
    color: 'var(--ink)',
    outline: 'none',
    transition: 'border-color 0.15s',
    width: '100%',
  },
  error: {
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: '0.7rem',
    color: 'var(--rust)',
    marginTop: '-8px',
  },
  submitBtn: {
    marginTop: '8px',
    width: '100%',
  },
  footer: {
    marginTop: '24px',
    textAlign: 'center' as const,
    fontFamily: '"Noto Serif", Georgia, serif',
    fontSize: '0.85rem',
    color: 'var(--smoke)',
  },
  link: {
    color: 'var(--rust)',
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  },
};
