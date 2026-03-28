import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { getSession, cleanDataset } from '../api';

// ── Download helpers ──────────────────────────────────────────────────────────

function downloadCSV(filename, csvString) {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function statsToCSV(cmdResult) {
  if (cmdResult.stats_type === 'column') {
    const rows = [['Statistic', 'Value']];
    Object.entries(cmdResult.stats).forEach(([k, v]) => {
      rows.push([k.replace(/_/g, ' '), v === null ? '' : v]);
    });
    return rows.map(r => r.join(',')).join('\n');
  }
  // dataset summary
  const headers = ['Column', 'Type', 'Count', 'Nulls', 'Unique', 'Mean', 'Median', 'Mode', 'Std', 'Min', 'Max', 'Skewness'];
  const rows = [headers];
  cmdResult.summary.forEach(r => {
    rows.push([
      r.column, r.dtype, r.count, r.null_count, r.unique,
      r.mean ?? '', r.median ?? '', r.mode ?? r.top_value ?? '',
      r.std ?? '', r.min ?? '', r.max ?? '', r.skewness ?? '',
    ]);
  });
  return rows.map(r => r.join(',')).join('\n');
}

// ── Scrollable data table ─────────────────────────────────────────────────────

function DataTable({ columns, rows, caption, highlightCol, removedRows = [] }) {
  if (!rows || rows.length === 0)
    return <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>No data.</p>;

  const removedSet = new Set(removedRows.map((r) => JSON.stringify(r)));

  return (
    <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
      {caption && (
        <p style={{ padding: '0.45rem 1rem', margin: 0, background: '#f3f4f6', fontSize: '0.78rem', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
          {caption}
        </p>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
        <thead>
          <tr style={{ background: '#f9fafb' }}>
            {columns.map((col) => (
              <th key={col} style={{ padding: '0.55rem 0.85rem', textAlign: 'left', fontWeight: 600, color: col === highlightCol ? '#4f46e5' : '#374151', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>
                {col}{col === highlightCol ? ' *' : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const isRemoved = removedSet.has(JSON.stringify(row));
            return (
              <tr key={i} style={{ background: isRemoved ? '#fef2f2' : i % 2 === 0 ? 'white' : '#f9fafb' }}>
                {columns.map((col) => (
                  <td key={col} style={{ padding: '0.45rem 0.85rem', color: isRemoved ? '#dc2626' : '#111827', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap', textDecoration: isRemoved ? 'line-through' : 'none' }}>
                    {row[col] === '' || row[col] === null || row[col] === undefined
                      ? <span style={{ color: '#d1d5db', fontStyle: 'italic' }}>null</span>
                      : String(row[col])}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Diff table for modified rows ──────────────────────────────────────────────

function ModifiedTable({ columns, modifiedRows, column }) {
  if (!modifiedRows || modifiedRows.length === 0) return null;
  return (
    <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #fde68a', marginTop: '0.75rem' }}>
      <p style={{ padding: '0.45rem 1rem', margin: 0, background: '#fffbeb', fontSize: '0.78rem', color: '#92400e', borderBottom: '1px solid #fde68a' }}>
        ✏️ Modified rows — showing changed values in <strong>{column}</strong> (up to 20)
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
        <thead>
          <tr style={{ background: '#fffbeb' }}>
            {columns.map((col) => (
              <th key={col} style={{ padding: '0.45rem 0.75rem', textAlign: 'left', fontWeight: 600, color: col === column ? '#92400e' : '#374151', borderBottom: '1px solid #fde68a', whiteSpace: 'nowrap' }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {modifiedRows.map(({ before, after }, i) => (
            <React.Fragment key={i}>
              <tr style={{ background: '#fef2f2' }}>
                {columns.map((col) => (
                  <td key={col} style={{ padding: '0.35rem 0.75rem', color: col === column ? '#dc2626' : '#6b7280', borderBottom: 'none', whiteSpace: 'nowrap', textDecoration: col === column ? 'line-through' : 'none', fontSize: '0.8rem' }}>
                    {before[col] === '' ? <span style={{ fontStyle: 'italic', color: '#d1d5db' }}>null</span> : String(before[col] ?? '')}
                  </td>
                ))}
              </tr>
              <tr style={{ background: '#f0fdf4', borderBottom: '1px solid #e5e7eb' }}>
                {columns.map((col) => (
                  <td key={col} style={{ padding: '0.35rem 0.75rem', color: col === column ? '#16a34a' : '#374151', whiteSpace: 'nowrap', fontWeight: col === column ? 600 : 400 }}>
                    {after[col] === '' ? <span style={{ fontStyle: 'italic', color: '#d1d5db' }}>null</span> : String(after[col] ?? '')}
                  </td>
                ))}
              </tr>
            </React.Fragment>
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
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!session && sessionId) {
      setLoading(true);
      getSession(sessionId)
        .then((data) => setSession(data))
        .catch(() => setFetchError('Session not found. It may have expired.'))
        .finally(() => setLoading(false));
    }
  }, [sessionId, session]);

  // ── Run NL command ──────────────────────────────────────────────────────────

  async function handleClean(e) {
    e.preventDefault();
    if (!command.trim()) return;
    setCmdLoading(true);
    setCmdError('');
    setCmdResult(null);
    try {
      const result = await cleanDataset(sessionId, command);
      setCmdResult(result);
      setHistory((prev) => [{ command, result }, ...prev]);
      const updated = await getSession(sessionId);
      setSession(updated);
      setCommand('');
    } catch (err) {
      const detail = err.response?.data?.detail;
      setCmdError(detail || 'Something went wrong. Try again.');
    } finally {
      setCmdLoading(false);
    }
  }

  // ── Download cleaned CSV ────────────────────────────────────────────────────

  function handleDownload() {
    window.open(`/api/download/${sessionId}`, '_blank');
  }

  // ── Render states ───────────────────────────────────────────────────────────

  if (loading) return <main style={{ padding: '3rem 2rem', textAlign: 'center', color: '#6b7280' }}>⏳ Loading session…</main>;

  if (fetchError) return (
    <main style={{ padding: '3rem 2rem', textAlign: 'center' }}>
      <p style={{ color: '#dc2626', marginBottom: '1rem' }}>⚠️ {fetchError}</p>
      <button onClick={() => navigate('/upload')} style={btnStyle('#4f46e5')}>← Upload a new file</button>
    </main>
  );

  const cols = session?.columns || [];

  // Generate chips from actual column names
  const cleaningChips = (() => {
    if (!cols.length) return [];
    const templates = [
      (c) => `remove outliers in ${c}`,
      (c) => `fill missing values with median in ${c}`,
      (c) => `normalize ${c}`,
      (c) => `drop rows with null values in ${c}`,
    ];
    const chips = templates.map((fn, i) => fn(cols[i % cols.length]));
    chips.push('drop duplicate rows');
    return chips;
  })();

  const vizChips = (() => {
    if (!cols.length) return [];
    const c0 = cols[0];
    const c1 = cols[1] || cols[0];
    return [
      'show correlation heatmap',
      `plot distribution of ${c0}`,
      `scatter plot of ${c0} vs ${c1}`,
      `box plot of ${c0}`,
      `show 3 clusters of ${c0} and ${c1}`,
    ];
  })();

  const statsChips = (() => {
    if (!cols.length) return [];
    return [
      'describe the dataset',
      `statistics for ${cols[0]}`,
      cols[1] ? `statistics for ${cols[1]}` : `statistics for ${cols[0]}`,
    ].filter((v, i, a) => a.indexOf(v) === i);
  })();

  return (
    <main style={{ maxWidth: '1100px', margin: '2rem auto', padding: '0 1.5rem' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>📊 {session?.filename}</h1>
          <p style={{ color: '#6b7280', margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
            {session?.total_rows?.toLocaleString()} rows × {session?.total_columns} columns &nbsp;·&nbsp;
            <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#9ca3af' }}>session: {sessionId?.slice(0, 8)}…</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button onClick={handleDownload} style={btnStyle('#16a34a')}>
            ⬇ Download CSV
          </button>
          <button onClick={() => navigate('/upload')} style={btnStyle(null, true)}>
            ↑ Upload new file
          </button>
        </div>
      </div>

      {/* ── Current dataset preview ── */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={sectionHead}>Current Dataset Preview</h2>
        <DataTable
          columns={cols}
          rows={session?.preview || []}
          caption={`Showing first ${session?.preview?.length || 0} of ${session?.total_rows?.toLocaleString()} rows`}
        />
      </section>

      {/* ── NL command input ── */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={sectionHead}>🧠 Clean or Visualize — just type it</h2>

        {/* Two chip rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.85rem' }}>
          {/* Cleaning chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
            <span style={chipLabel('#4f46e5')}>🧹 Clean</span>
            {cleaningChips.map((ex) => (
              <button key={ex} onClick={() => setCommand(ex)} style={chip('#4f46e5', '#eef2ff', '#c7d2fe')}>{ex}</button>
            ))}
          </div>
          {/* Viz chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
            <span style={chipLabel('#0891b2')}>📊 Visualize</span>
            {vizChips.map((ex) => (
              <button key={ex} onClick={() => setCommand(ex)} style={chip('#0891b2', '#ecfeff', '#a5f3fc')}>{ex}</button>
            ))}
          </div>
          {/* Stats chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
            <span style={chipLabel('#7c3aed')}>📈 Statistics</span>
            {statsChips.map((ex) => (
              <button key={ex} onClick={() => setCommand(ex)} style={chip('#7c3aed', '#f5f3ff', '#ddd6fe')}>{ex}</button>
            ))}
          </div>
        </div>

        <form onSubmit={handleClean} style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder='e.g. "show correlation heatmap" or "remove outliers in age"'
            disabled={cmdLoading}
            style={{ flex: 1, padding: '0.75rem 1rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.95rem', outline: 'none' }}
          />
          <button type="submit" disabled={!command.trim() || cmdLoading} style={btnStyle(command.trim() && !cmdLoading ? '#4f46e5' : '#c7d2fe')}>
            {cmdLoading ? '⏳ Running…' : '▶ Run'}
          </button>
        </form>

        {cmdError && (
          <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#dc2626', fontSize: '0.875rem' }}>
            ⚠️ {cmdError}
          </div>
        )}
      </section>

      {/* ── Latest result (cleaning or visualization) ── */}
      {cmdResult && (
        <section style={{ marginBottom: '2rem' }}>
          <div style={{ padding: '0.75rem 1rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', marginBottom: '1rem', color: '#166534', fontSize: '0.875rem' }}>
            ✅ <strong>{cmdResult.message}</strong>
            {cmdResult.rows_affected != null && ` — ${cmdResult.rows_affected} rows affected`}
            {cmdResult.operation && ` · operation: ${cmdResult.operation}`}
            {cmdResult.column && ` on "${cmdResult.column}"`}
          </div>

          {/* ── Visualization result ── */}
          {cmdResult.type === 'visualization' && cmdResult.image && (
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1rem' }}>
              <img
                src={`data:image/png;base64,${cmdResult.image}`}
                alt={cmdResult.operation}
                style={{ maxWidth: '100%', borderRadius: '6px', display: 'block', margin: '0 auto' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <p style={{ color: '#6b7280', fontSize: '0.8rem', margin: 0 }}>
                  📊 {cmdResult.operation?.replace(/_/g, ' ')}
                  {cmdResult.column ? ` — ${cmdResult.column}` : ''}
                </p>
                <a
                  href={`data:image/png;base64,${cmdResult.image}`}
                  download={`${cmdResult.operation || 'chart'}.png`}
                  style={{ ...btnStyle('#0891b2'), textDecoration: 'none', fontSize: '0.82rem' }}
                >
                  ⬇ Download PNG
                </a>
              </div>
            </div>
          )}

          {/* ── Statistics result ── */}
          {cmdResult.type === 'statistics' && (
            <div style={{ background: 'white', border: '1px solid #ddd6fe', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ padding: '0.6rem 1rem', background: '#f5f3ff', borderBottom: '1px solid #ddd6fe', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.82rem', color: '#7c3aed', fontWeight: 600 }}>📈 {cmdResult.message}</span>
                <button
                  onClick={() => downloadCSV(
                    `stats_${cmdResult.column || 'dataset'}.csv`,
                    statsToCSV(cmdResult)
                  )}
                  style={{ padding: '0.3rem 0.75rem', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  ⬇ Download CSV
                </button>
              </div>

              {/* Single column stats */}
              {cmdResult.stats_type === 'column' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0', padding: '0.5rem' }}>
                  {Object.entries(cmdResult.stats).map(([key, val]) => (
                    <div key={key} style={{ padding: '0.6rem 0.85rem', borderRadius: '6px', margin: '0.25rem' }}>
                      <div style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{key.replace(/_/g, ' ')}</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginTop: '0.15rem' }}>
                        {val === null ? <span style={{ color: '#d1d5db' }}>—</span> : String(val)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Dataset summary table */}
              {cmdResult.stats_type === 'dataset' && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        {['Column', 'Type', 'Count', 'Nulls', 'Unique', 'Mean', 'Median', 'Mode', 'Std', 'Min', 'Max'].map(h => (
                          <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cmdResult.summary.map((row, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                          <td style={{ ...statsTd, fontWeight: 600, color: '#4f46e5', fontFamily: 'monospace' }}>{row.column}</td>
                          <td style={{ ...statsTd, color: '#9ca3af', fontFamily: 'monospace' }}>{row.dtype}</td>
                          <td style={statsTd}>{row.count}</td>
                          <td style={{ ...statsTd, color: row.null_count > 0 ? '#dc2626' : '#6b7280' }}>{row.null_count}</td>
                          <td style={statsTd}>{row.unique}</td>
                          <td style={statsTd}>{row.mean ?? '—'}</td>
                          <td style={statsTd}>{row.median ?? '—'}</td>
                          <td style={statsTd}>{row.mode ?? row.top_value ?? '—'}</td>
                          <td style={statsTd}>{row.std ?? '—'}</td>
                          <td style={statsTd}>{row.min ?? '—'}</td>
                          <td style={statsTd}>{row.max ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Cleaning result — Before / After ── */}
          {cmdResult.type !== 'visualization' && cmdResult.before_preview && cmdResult.after_preview && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={diffHead('before')}>Before</h3>
                <DataTable
                  columns={cols}
                  rows={cmdResult.before_preview}
                  caption={`${cmdResult.before_preview.length} rows shown`}
                  highlightCol={cmdResult.column}
                  removedRows={cmdResult.removed_rows || []}
                />
              </div>
              <div>
                <h3 style={diffHead('after')}>After</h3>
                <DataTable
                  columns={cmdResult.after_preview[0] ? Object.keys(cmdResult.after_preview[0]) : cols}
                  rows={cmdResult.after_preview}
                  caption={`${cmdResult.after_preview.length} rows shown`}
                  highlightCol={cmdResult.column}
                />
              </div>
            </div>
          )}

          {/* Removed rows panel */}
          {cmdResult.removed_rows?.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#dc2626', marginBottom: '0.5rem' }}>
                🗑 Removed rows ({cmdResult.removed_rows.length} shown, up to 20)
              </h3>
              <DataTable
                columns={cols}
                rows={cmdResult.removed_rows}
                caption="These rows were dropped from the dataset"
                removedRows={cmdResult.removed_rows}
              />
            </div>
          )}

          {/* Modified rows panel */}
          {cmdResult.modified_rows?.length > 0 && (
            <ModifiedTable
              columns={cols}
              modifiedRows={cmdResult.modified_rows}
              column={cmdResult.column}
            />
          )}

          {/* Download button — only shown for cleaning ops */}
          {cmdResult.type !== 'visualization' && (
            <button onClick={handleDownload} style={{ ...btnStyle('#16a34a'), marginTop: '0.75rem' }}>
              ⬇ Download Updated CSV
            </button>
          )}
        </section>
      )}

      {/* ── Command history ── */}
      {history.length > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={sectionHead}>📜 Command History</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {history.map(({ command: cmd, result: r }, i) => (
              <div key={i} style={{ padding: '0.5rem 0.85rem', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.83rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ color: '#374151' }}>"{cmd}"</span>
                <span style={{ color: '#6b7280' }}>{r.operation}{r.column ? ` on ${r.column}` : ''} · {r.rows_affected} rows affected</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Column reference ── */}
      <section>
        <h2 style={sectionHead}>📋 Columns ({cols.length})</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {cols.map((col) => (
            <span key={col} style={{ padding: '0.25rem 0.6rem', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.8rem', fontFamily: 'monospace', color: '#374151' }}>
              {col}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}

// ── Style helpers ─────────────────────────────────────────────────────────────

const sectionHead = { fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: '#374151' };

const chipStyle = {
  padding: '0.3rem 0.7rem',
  background: '#eef2ff',
  color: '#4f46e5',
  border: '1px solid #c7d2fe',
  borderRadius: '999px',
  fontSize: '0.78rem',
  cursor: 'pointer',
  fontWeight: 500,
};

function chip(color, bg, border) {
  return { padding: '0.25rem 0.65rem', background: bg, color, border: `1px solid ${border}`, borderRadius: '999px', fontSize: '0.76rem', cursor: 'pointer', fontWeight: 500 };
}

function chipLabel(color) {
  return { fontSize: '0.72rem', fontWeight: 700, color, padding: '0.2rem 0.5rem', background: 'transparent', border: 'none', whiteSpace: 'nowrap', letterSpacing: '0.03em' };
}

function btnStyle(bg, outline = false) {
  return {
    padding: '0.55rem 1.1rem',
    background: outline ? 'white' : (bg || '#4f46e5'),
    color: outline ? '#374151' : 'white',
    border: outline ? '1px solid #d1d5db' : 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  };
}

const statsTd = { padding: '0.45rem 0.75rem', color: '#374151', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' };

function diffHead(side) {
  return {
    fontSize: '0.875rem',
    fontWeight: 600,
    marginBottom: '0.5rem',
    color: side === 'before' ? '#dc2626' : '#16a34a',
  };
}
