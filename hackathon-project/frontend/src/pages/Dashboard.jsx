import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { getSession, cleanDataset } from '../api';

// ── Small helper: scrollable data table ──────────────────────────────────────

function DataTable({ columns, rows, caption }) {
  if (!rows || rows.length === 0) return <p style={{ color: '#6b7280' }}>No data.</p>;

  return (
    <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
      {caption && (
        <p style={{ padding: '0.5rem 1rem', margin: 0, background: '#f3f4f6', fontSize: '0.8rem', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
          {caption}
        </p>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ background: '#f9fafb' }}>
            {columns.map((col) => (
              <th
                key={col}
                style={{
                  padding: '0.6rem 0.9rem',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#374151',
                  borderBottom: '1px solid #e5e7eb',
                  whiteSpace: 'nowrap',
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
              {columns.map((col) => (
                <td
                  key={col}
                  style={{
                    padding: '0.5rem 0.9rem',
                    color: '#111827',
                    borderBottom: '1px solid #f3f4f6',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row[col] === '' || row[col] === null || row[col] === undefined
                    ? <span style={{ color: '#d1d5db', fontStyle: 'italic' }}>null</span>
                    : String(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [session, setSession] = useState(location.state?.session || null);
  const [loading, setLoading] = useState(!location.state?.session);
  const [fetchError, setFetchError] = useState('');

  const [command, setCommand] = useState('');
  const [cmdLoading, setCmdLoading] = useState(false);
  const [cmdError, setCmdError] = useState('');
  const [cmdResult, setCmdResult] = useState(null);

  // Load session from backend if we navigated here directly (no state)
  useEffect(() => {
    if (!session && sessionId) {
      setLoading(true);
      getSession(sessionId)
        .then((data) => setSession(data))
        .catch(() => setFetchError('Session not found. It may have expired.'))
        .finally(() => setLoading(false));
    }
  }, [sessionId, session]);

  // ── Command submit ──────────────────────────────────────────────────────────

  async function handleClean(e) {
    e.preventDefault();
    if (!command.trim()) return;
    setCmdLoading(true);
    setCmdError('');
    setCmdResult(null);
    try {
      const result = await cleanDataset(sessionId, command);
      setCmdResult(result);
      // Refresh the preview after a successful clean
      const updated = await getSession(sessionId);
      setSession(updated);
      setCommand('');
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      if (status === 501) {
        setCmdError('NL classifier not ready yet — Task 4 will wire this up.');
      } else {
        setCmdError(detail || 'Something went wrong. Try again.');
      }
    } finally {
      setCmdLoading(false);
    }
  }

  // ── Render states ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main style={{ padding: '3rem 2rem', textAlign: 'center', color: '#6b7280' }}>
        ⏳ Loading session…
      </main>
    );
  }

  if (fetchError) {
    return (
      <main style={{ padding: '3rem 2rem', textAlign: 'center' }}>
        <p style={{ color: '#dc2626', marginBottom: '1rem' }}>⚠️ {fetchError}</p>
        <button
          onClick={() => navigate('/upload')}
          style={{ padding: '0.75rem 1.5rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
        >
          ← Upload a new file
        </button>
      </main>
    );
  }

  const exampleCommands = [
    'remove outliers in cholesterol',
    'fill missing values with median in age',
    'drop rows with null values in trestbps',
    'normalize chol column',
  ];

  return (
    <main style={{ maxWidth: '1100px', margin: '2rem auto', padding: '0 1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
            📊 {session?.filename}
          </h1>
          <p style={{ color: '#6b7280', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
            {session?.total_rows?.toLocaleString()} rows × {session?.total_columns} columns
            &nbsp;·&nbsp;
            <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#9ca3af' }}>
              session: {sessionId?.slice(0, 8)}…
            </span>
          </p>
        </div>
        <button
          onClick={() => navigate('/upload')}
          style={{ padding: '0.5rem 1rem', background: 'white', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', color: '#374151', fontWeight: 500 }}
        >
          ↑ Upload new file
        </button>
      </div>

      {/* Dataset preview */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: '#374151' }}>
          Current Dataset Preview
        </h2>
        <DataTable
          columns={session?.columns || []}
          rows={session?.preview || []}
          caption={`Showing first ${session?.preview?.length || 0} of ${session?.total_rows?.toLocaleString()} rows`}
        />
      </section>

      {/* NL Command input */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
          🧠 Clean with Natural Language
        </h2>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
          Type a plain-English command. The AI will map it to a safe pandas operation.
        </p>

        {/* Example chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
          {exampleCommands.map((ex) => (
            <button
              key={ex}
              onClick={() => setCommand(ex)}
              style={{
                padding: '0.3rem 0.7rem',
                background: '#eef2ff',
                color: '#4f46e5',
                border: '1px solid #c7d2fe',
                borderRadius: '999px',
                fontSize: '0.78rem',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              {ex}
            </button>
          ))}
        </div>

        <form onSubmit={handleClean} style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder='e.g. "remove outliers in cholesterol"'
            disabled={cmdLoading}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '0.95rem',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={!command.trim() || cmdLoading}
            style={{
              padding: '0.75rem 1.5rem',
              background: command.trim() && !cmdLoading ? '#4f46e5' : '#c7d2fe',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: command.trim() && !cmdLoading ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap',
            }}
          >
            {cmdLoading ? '⏳ Running…' : '▶ Run'}
          </button>
        </form>

        {/* Command error */}
        {cmdError && (
          <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#dc2626', fontSize: '0.875rem' }}>
            ⚠️ {cmdError}
          </div>
        )}
      </section>

      {/* Clean result */}
      {cmdResult && (
        <section style={{ marginBottom: '2rem' }}>
          <div style={{ padding: '0.75rem 1rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', marginBottom: '1rem', color: '#166534', fontSize: '0.875rem' }}>
            ✅ <strong>{cmdResult.message}</strong>
            {cmdResult.rows_affected != null && ` — ${cmdResult.rows_affected} rows affected`}
            {cmdResult.operation && ` · operation: ${cmdResult.operation}`}
            {cmdResult.column && ` on column "${cmdResult.column}"`}
          </div>

          {cmdResult.before_preview && cmdResult.after_preview && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>Before</h3>
                <DataTable columns={session?.columns || []} rows={cmdResult.before_preview} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>After</h3>
                <DataTable columns={session?.columns || []} rows={cmdResult.after_preview} />
              </div>
            </div>
          )}
        </section>
      )}

      {/* Column reference */}
      <section>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
          📋 Columns ({session?.columns?.length})
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {(session?.columns || []).map((col) => (
            <span
              key={col}
              style={{
                padding: '0.25rem 0.6rem',
                background: '#f3f4f6',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                color: '#374151',
              }}
            >
              {col}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
