'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    // Validation
    if (!name.trim() || !password || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    register(name.trim(), password)
      .then(() => {
        router.push('/login');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Registration failed');
        setLoading(false);
      });
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>MangaKo</h1>
          <p style={styles.subtitle}>Create your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form} noValidate>
          {/* Name */}
          <div style={styles.field}>
            <label htmlFor="name" style={styles.label}>
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your display name"
              disabled={loading}
              style={styles.input}
            />
          </div>

          {/* Password */}
          <div style={styles.field}>
            <label htmlFor="password" style={styles.label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              disabled={loading}
              style={styles.input}
            />
          </div>

          {/* Confirm Password */}
          <div style={styles.field}>
            <label htmlFor="confirmPassword" style={styles.label}>
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
              disabled={loading}
              style={styles.input}
            />
          </div>

          {/* Error */}
          {error && <p style={styles.error}>{error}</p>}

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ ...styles.button, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Creating account…' : 'Register'}
          </button>
        </form>

        {/* Footer link */}
        <p style={styles.footer}>
          Already have an account?{' '}
          <Link href="/login" style={styles.link}>
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

// ─── Inline styles ─────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
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
    padding: '40px 32px',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '32px',
  },
  title: {
    fontFamily: '"Playfair Display", Georgia, serif',
    fontSize: '2rem',
    fontWeight: '700',
    color: 'var(--ink)',
    letterSpacing: '-0.01em',
  },
  subtitle: {
    fontFamily: '"IBM Plex Mono", "Courier New", monospace',
    fontSize: '0.7rem',
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.12em',
    color: 'var(--smoke)',
    marginTop: '6px',
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
    fontFamily: '"IBM Plex Mono", "Courier New", monospace',
    fontSize: '0.65rem',
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    color: 'var(--smoke)',
  },
  input: {
    border: '1px solid var(--aged)',
    background: 'var(--cream)',
    color: 'var(--ink)',
    padding: '10px 14px',
    fontSize: '0.95rem',
    fontFamily: '"Noto Serif", Georgia, serif',
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  error: {
    fontFamily: '"IBM Plex Mono", "Courier New", monospace',
    fontSize: '0.7rem',
    color: 'var(--rust)',
    textAlign: 'center' as const,
  },
  button: {
    width: '100%',
    marginTop: '8px',
  },
  footer: {
    marginTop: '24px',
    textAlign: 'center' as const,
    fontFamily: '"IBM Plex Mono", "Courier New", monospace',
    fontSize: '0.65rem',
    color: 'var(--smoke)',
  },
  link: {
    color: 'var(--rust)',
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  },
};
