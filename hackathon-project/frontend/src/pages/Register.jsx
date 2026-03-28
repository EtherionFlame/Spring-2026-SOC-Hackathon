import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function validate() {
    if (!email.trim()) return 'Email is required.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return 'Enter a valid email address.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (password !== confirm) return 'Passwords do not match.';
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { email, password });
      login(data.token, data.user);
      navigate('/upload', { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          Create an account
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
          Save your cleaning history across sessions
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Password <span style={{ color: '#9ca3af', fontWeight: 400 }}>(min 8 characters)</span></label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              style={{
                ...inputStyle,
                borderColor: confirm && confirm !== password ? '#fca5a5' : '#d1d5db',
              }}
            />
            {confirm && confirm !== password && (
              <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '0.3rem' }}>
                Passwords don't match
              </p>
            )}
          </div>

          {error && <div style={errorStyle}>⚠️ {error}</div>}

          <button type="submit" disabled={loading} style={btnStyle(loading)}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.875rem', color: '#6b7280' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
          {' · '}
          <Link to="/upload" style={{ color: '#6b7280', textDecoration: 'none' }}>
            Continue as guest
          </Link>
        </p>
      </div>
    </main>
  );
}

const pageStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: 'calc(100vh - 56px)',
  background: '#f9fafb',
  padding: '2rem 1rem',
};

const cardStyle = {
  background: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '2rem',
  width: '100%',
  maxWidth: '400px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: 600,
  color: '#374151',
  marginBottom: '0.4rem',
};

const inputStyle = {
  width: '100%',
  padding: '0.7rem 0.9rem',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '0.95rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const errorStyle = {
  padding: '0.65rem 0.9rem',
  background: '#fef2f2',
  border: '1px solid #fca5a5',
  borderRadius: '8px',
  color: '#dc2626',
  fontSize: '0.875rem',
};

const btnStyle = (loading) => ({
  padding: '0.75rem',
  background: loading ? '#c7d2fe' : '#4f46e5',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontWeight: 700,
  fontSize: '1rem',
  cursor: loading ? 'not-allowed' : 'pointer',
  marginTop: '0.25rem',
});
