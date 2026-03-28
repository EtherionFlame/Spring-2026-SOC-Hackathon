import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getHistory } from '../api';

export default function History() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!token) return;
    getHistory()
      .then(setSessions)
      .catch(() => setError('Failed to load history.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (!token) {
    return (
      <main style={pageStyle}>
        <div style={emptyBox}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔒</div>
          <h2 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Sign in to view history</h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            Your cleaning sessions are saved when you're logged in.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button onClick={() => navigate('/login')} style={btn('#4f46e5')}>Sign in</button>
            <button onClick={() => navigate('/register')} style={btn(null, true)}>Register</button>
          </div>
        </div>
      </main>
    );
  }

  if (loading) return <main style={pageStyle}><p style={{ color: '#6b7280' }}>⏳ Loading history…</p></main>;
  if (error)   return <main style={pageStyle}><p style={{ color: '#dc2626' }}>⚠️ {error}</p></main>;

  return (
    <main style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>📜 Session History</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.2rem' }}>{user?.email}</p>
        </div>
        <button onClick={() => navigate('/upload')} style={btn('#4f46e5')}>
          + New Session
        </button>
      </div>

      {/* Empty state */}
      {sessions.length === 0 && (
        <div style={emptyBox}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📂</div>
          <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>No sessions yet</p>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Upload a CSV to start cleaning.
          </p>
          <button onClick={() => navigate('/upload')} style={btn('#4f46e5')}>Upload CSV</button>
        </div>
      )}

      {/* Session list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {sessions.map((s) => {
          const isOpen = expanded === s.session_id;
          return (
            <div key={s.session_id} style={cardStyle}>

              {/* Session header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 600, color: '#111827' }}>📄 {s.filename}</span>
                    {s.active
                      ? <span style={badge('#dcfce7', '#16a34a')}>● Active</span>
                      : <span style={badge('#f3f4f6', '#9ca3af')}>Expired</span>}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '0.2rem' }}>
                    {new Date(s.uploaded_at).toLocaleString()} ·{' '}
                    {s.log.length} operation{s.log.length !== 1 ? 's' : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {s.active && (
                    <button
                      onClick={() => navigate(`/dashboard/${s.session_id}`)}
                      style={btn('#4f46e5')}
                    >
                      Resume →
                    </button>
                  )}
                  {s.log.length > 0 && (
                    <button
                      onClick={() => setExpanded(isOpen ? null : s.session_id)}
                      style={btn(null, true)}
                    >
                      {isOpen ? 'Hide log ▲' : 'View log ▼'}
                    </button>
                  )}
                </div>
              </div>

              {/* Cleaning log */}
              {isOpen && s.log.length > 0 && (
                <div style={{ marginTop: '0.75rem', borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                        {['Command', 'Operation', 'Column', 'Rows affected', 'Time'].map(h => (
                          <th key={h} style={{ padding: '0.4rem 0.7rem', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {s.log.map((row, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                          <td style={td}><em style={{ color: '#4f46e5' }}>"{row.command}"</em></td>
                          <td style={td}>{row.operation ?? '—'}</td>
                          <td style={{ ...td, fontFamily: 'monospace' }}>{row.column_name ?? '—'}</td>
                          <td style={td}>{row.rows_affected ?? '—'}</td>
                          <td style={{ ...td, color: '#9ca3af' }}>{new Date(row.executed_at).toLocaleTimeString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const pageStyle = { maxWidth: '800px', margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center' };

const emptyBox = {
  padding: '3rem 2rem',
  background: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  textAlign: 'center',
};

const cardStyle = {
  background: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  padding: '1rem 1.25rem',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

const td = {
  padding: '0.4rem 0.7rem',
  color: '#374151',
  borderBottom: '1px solid #f3f4f6',
  whiteSpace: 'nowrap',
};

function btn(bg, outline = false) {
  return {
    padding: '0.4rem 0.9rem',
    background: outline ? 'white' : (bg || '#4f46e5'),
    color: outline ? '#374151' : 'white',
    border: outline ? '1px solid #d1d5db' : 'none',
    borderRadius: '7px',
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  };
}

function badge(bg, color) {
  return {
    padding: '0.15rem 0.5rem',
    background: bg,
    color,
    borderRadius: '999px',
    fontSize: '0.72rem',
    fontWeight: 600,
  };
}
