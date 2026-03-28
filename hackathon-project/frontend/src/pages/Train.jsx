import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSession, trainModel } from '../api';

const MODELS = [
  {
    id: 'random_forest',
    label: 'Random Forest',
    icon: '🌲',
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    desc: 'Ensemble of decision trees. Works for both classification and regression. Handles non-linear patterns well.',
    task: 'both',
  },
  {
    id: 'logistic_regression',
    label: 'Logistic Regression',
    icon: '📉',
    color: '#4f46e5',
    bg: '#eef2ff',
    border: '#c7d2fe',
    desc: 'Predicts a categorical outcome (yes/no, class A/B/C). Best when classes are roughly linearly separable.',
    task: 'classification',
  },
  {
    id: 'linear_regression',
    label: 'Linear Regression',
    icon: '📈',
    color: '#0891b2',
    bg: '#ecfeff',
    border: '#a5f3fc',
    desc: 'Predicts a continuous numeric value (price, temperature, score). Assumes a linear relationship.',
    task: 'regression',
  },
];

const TEST_SIZES = [
  { value: 0.1, label: '10% test' },
  { value: 0.2, label: '20% test' },
  { value: 0.25, label: '25% test' },
  { value: 0.3, label: '30% test' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function MetricBadge({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center', padding: '0.75rem 1.25rem', background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb', minWidth: '110px' }}>
      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: color || '#111827' }}>{value}</div>
      <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
    </div>
  );
}

function ChartCard({ title, b64 }) {
  function download() {
    const a = document.createElement('a');
    a.href = `data:image/png;base64,${b64}`;
    a.download = `${title.replace(/\s+/g, '_').toLowerCase()}.png`;
    a.click();
  }
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#374151' }}>{title}</span>
        <button
          onClick={download}
          style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', color: '#374151' }}
        >
          ⬇ PNG
        </button>
      </div>
      <img src={`data:image/png;base64,${b64}`} alt={title} style={{ width: '100%', borderRadius: '6px' }} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Train() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession]     = useState(null);
  const [loadErr, setLoadErr]     = useState('');

  // Step 1 — model choice
  const [selectedModel, setSelectedModel] = useState('');

  // Step 2 — column selection
  const [targetCol, setTargetCol]     = useState('');
  const [featureCols, setFeatureCols] = useState([]);
  const [testSize, setTestSize]       = useState(0.2);

  // Step 3 — results
  const [training, setTraining] = useState(false);
  const [result, setResult]     = useState(null);
  const [trainErr, setTrainErr] = useState('');

  // Load session on mount
  useEffect(() => {
    if (!sessionId) { setLoadErr('No session ID provided.'); return; }
    getSession(sessionId)
      .then(setSession)
      .catch(() => setLoadErr('Could not load session. Return to Upload and try again.'));
  }, [sessionId]);

  const cols = session?.columns || [];

  // When target changes, remove it from features if present
  function handleTargetChange(col) {
    setTargetCol(col);
    setFeatureCols((prev) => prev.filter((c) => c !== col));
  }

  function toggleFeature(col) {
    if (col === targetCol) return; // can't select target as feature
    setFeatureCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  }

  function selectAllFeatures() {
    setFeatureCols(cols.filter((c) => c !== targetCol));
  }

  async function handleTrain() {
    setTrainErr('');
    setResult(null);
    if (!selectedModel) { setTrainErr('Please select a model.'); return; }
    if (!targetCol) { setTrainErr('Please select a target column.'); return; }
    if (featureCols.length === 0) { setTrainErr('Please select at least one feature column.'); return; }

    setTraining(true);
    try {
      const res = await trainModel(sessionId, selectedModel, targetCol, featureCols, testSize);
      setResult(res);
    } catch (err) {
      const msg = err?.response?.data?.detail || err.message || 'Training failed.';
      setTrainErr(msg);
    } finally {
      setTraining(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loadErr) {
    return (
      <main style={{ maxWidth: '680px', margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
        <p style={{ color: '#dc2626', background: '#fef2f2', padding: '1rem', borderRadius: '8px', border: '1px solid #fecaca' }}>{loadErr}</p>
        <button onClick={() => navigate('/upload')} style={btnStyle('#4f46e5')}>← Back to Upload</button>
      </main>
    );
  }

  if (!session) {
    return (
      <main style={{ maxWidth: '680px', margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center', color: '#6b7280' }}>
        Loading session…
      </main>
    );
  }

  return (
    <main style={{ maxWidth: '900px', margin: '2.5rem auto', padding: '0 1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
        <button
          onClick={() => navigate(`/dashboard/${sessionId}`)}
          style={{ padding: '0.35rem 0.8rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', color: '#374151' }}
        >
          ← Dashboard
        </button>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', margin: 0 }}>
          🤖 Train a Model
        </h1>
      </div>
      <p style={{ color: '#6b7280', fontSize: '0.88rem', marginBottom: '2rem' }}>
        Dataset: <strong>{session.filename}</strong> — {session.total_rows} rows × {session.total_columns} columns
      </p>

      {/* ── Step 1: Model selection ─────────────────────────────────────────── */}
      <SectionHeader n={1} title="Choose a Model" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem', marginBottom: '2rem' }}>
        {MODELS.map((m) => {
          const active = selectedModel === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setSelectedModel(m.id)}
              style={{
                textAlign: 'left', padding: '1rem 1.1rem',
                background: active ? m.bg : 'white',
                border: `2px solid ${active ? m.color : '#e5e7eb'}`,
                borderRadius: '10px', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>{m.icon}</div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: active ? m.color : '#111827', marginBottom: '0.35rem' }}>{m.label}</div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.45 }}>{m.desc}</div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', fontWeight: 600, color: active ? m.color : '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {m.task === 'both' ? 'Classification & Regression' : m.task}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Step 2: Columns ─────────────────────────────────────────────────── */}
      <SectionHeader n={2} title="Select Columns" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {/* Target column */}
        <div>
          <label style={labelStyle}>Target Column <span style={{ color: '#6b7280', fontWeight: 400 }}>(what to predict)</span></label>
          <select value={targetCol} onChange={(e) => handleTargetChange(e.target.value)} style={selectStyle}>
            <option value="">— select a column —</option>
            {cols.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Test size */}
        <div>
          <label style={labelStyle}>Train / Test Split</label>
          <select value={testSize} onChange={(e) => setTestSize(parseFloat(e.target.value))} style={selectStyle}>
            {TEST_SIZES.map(({ value, label }) => (
              <option key={value} value={value}>{label} / {Math.round((1 - value) * 100)}% train</option>
            ))}
          </select>
        </div>
      </div>

      {/* Feature columns */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <label style={{ ...labelStyle, margin: 0 }}>
            Feature Columns <span style={{ color: '#6b7280', fontWeight: 400 }}>(inputs — {featureCols.length} selected)</span>
          </label>
          {targetCol && (
            <button onClick={selectAllFeatures} style={{ fontSize: '0.75rem', color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
              Select all
            </button>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
          {cols.map((c) => {
            const isTarget = c === targetCol;
            const selected = featureCols.includes(c);
            return (
              <button
                key={c}
                disabled={isTarget}
                onClick={() => toggleFeature(c)}
                style={{
                  padding: '0.3rem 0.7rem', fontSize: '0.78rem', borderRadius: '6px', cursor: isTarget ? 'not-allowed' : 'pointer',
                  border: `1px solid ${isTarget ? '#fecaca' : selected ? '#4f46e5' : '#d1d5db'}`,
                  background: isTarget ? '#fef2f2' : selected ? '#eef2ff' : '#f9fafb',
                  color: isTarget ? '#dc2626' : selected ? '#4f46e5' : '#374151',
                  fontWeight: selected ? 600 : 400,
                  opacity: isTarget ? 0.6 : 1,
                }}
              >
                {isTarget ? `🎯 ${c}` : selected ? `✓ ${c}` : c}
              </button>
            );
          })}
        </div>
        {targetCol && featureCols.length === 0 && (
          <p style={{ fontSize: '0.78rem', color: '#f59e0b', marginTop: '0.4rem' }}>
            Select at least one feature column (click a column above or use "Select all").
          </p>
        )}
      </div>

      {/* ── Train button ────────────────────────────────────────────────────── */}
      {trainErr && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#dc2626', fontSize: '0.875rem' }}>
          {trainErr}
        </div>
      )}

      <button
        onClick={handleTrain}
        disabled={training}
        style={{
          ...btnStyle('#16a34a'),
          opacity: training ? 0.7 : 1,
          cursor: training ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          marginBottom: '2.5rem',
        }}
      >
        {training ? '⏳ Training…' : '🚀 Train Model'}
      </button>

      {/* ── Results ─────────────────────────────────────────────────────────── */}
      {result && <TrainResult result={result} />}
    </main>
  );
}


// ── Result display ────────────────────────────────────────────────────────────

function TrainResult({ result }) {
  const { model_name, task, target, features, metrics, charts, message } = result;
  const isClf = task === 'classification';

  return (
    <div>
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span style={{ fontSize: '1.3rem' }}>✅</span>
        <span style={{ fontWeight: 600, color: '#166534', fontSize: '0.95rem' }}>{message}</span>
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {[
          { k: 'Model', v: model_name },
          { k: 'Task', v: task },
          { k: 'Target', v: target },
          { k: 'Features', v: features.length },
          { k: 'Train rows', v: metrics.train_samples },
          { k: 'Test rows', v: metrics.test_samples },
        ].map(({ k, v }) => (
          <div key={k} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0.3rem 0.7rem', fontSize: '0.78rem' }}>
            <span style={{ color: '#9ca3af' }}>{k}: </span>
            <span style={{ fontWeight: 600, color: '#374151' }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Metrics */}
      <SectionHeader n={3} title={isClf ? 'Classification Metrics' : 'Regression Metrics'} />
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        {isClf ? (
          <>
            <MetricBadge label="Accuracy"  value={`${(metrics.accuracy  * 100).toFixed(1)}%`} color="#16a34a" />
            <MetricBadge label="Precision" value={`${(metrics.precision * 100).toFixed(1)}%`} color="#4f46e5" />
            <MetricBadge label="Recall"    value={`${(metrics.recall    * 100).toFixed(1)}%`} color="#0891b2" />
            <MetricBadge label="F1 Score"  value={`${(metrics.f1_score  * 100).toFixed(1)}%`} color="#7c3aed" />
          </>
        ) : (
          <>
            <MetricBadge label="R² Score" value={metrics.r2_score} color="#16a34a" />
            <MetricBadge label="RMSE"     value={metrics.rmse}     color="#dc2626" />
            <MetricBadge label="MAE"      value={metrics.mae}      color="#f59e0b" />
            <MetricBadge label="MSE"      value={metrics.mse}      color="#6b7280" />
          </>
        )}
      </div>

      {/* Charts */}
      {Object.keys(charts).length > 0 && (
        <>
          <SectionHeader n={4} title="Charts" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {charts.confusion_matrix    && <ChartCard title="Confusion Matrix"       b64={charts.confusion_matrix} />}
            {charts.feature_importance  && <ChartCard title="Feature Importance"     b64={charts.feature_importance} />}
            {charts.predicted_vs_actual && <ChartCard title="Predicted vs Actual"    b64={charts.predicted_vs_actual} />}
            {charts.residuals           && <ChartCard title="Residuals Plot"         b64={charts.residuals} />}
          </div>
        </>
      )}
    </div>
  );
}


// ── Tiny UI helpers ───────────────────────────────────────────────────────────

function SectionHeader({ n, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.9rem' }}>
      <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#4f46e5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800, flexShrink: 0 }}>
        {n}
      </span>
      <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827' }}>{title}</h2>
    </div>
  );
}

const labelStyle = { display: 'block', fontWeight: 600, fontSize: '0.83rem', color: '#374151', marginBottom: '0.35rem' };

const selectStyle = { width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.875rem', color: '#111827', background: 'white', cursor: 'pointer' };

function btnStyle(bg) {
  return { padding: '0.75rem 2rem', background: bg, color: 'white', border: 'none', borderRadius: '9px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', boxShadow: `0 4px 12px ${bg}55` };
}
