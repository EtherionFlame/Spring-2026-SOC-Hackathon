import { useNavigate } from 'react-router-dom';

const FEATURES = [
  { icon: '📂', title: 'Upload Any CSV',        desc: 'Drag and drop your dataset and get an instant preview.' },
  { icon: '🧠', title: 'Plain-English Commands', desc: 'Type commands naturally — no code or syntax needed.' },
  { icon: '📊', title: 'Instant Visualizations', desc: 'Ask for a heatmap, scatter plot, or cluster diagram and see it instantly.' },
  { icon: '📈', title: 'Descriptive Statistics', desc: 'Get mean, median, mode, std, skewness and more for any column or the full dataset.' },
  { icon: '🤖', title: 'ML Model Training',      desc: 'Train Random Forest, Logistic Regression, or Linear Regression on your cleaned data.' },
  { icon: '🔒', title: 'Safe by Design',         desc: 'All operations are whitelisted. No eval(), ever.' },
  { icon: '⬇', title: 'Download Anything',       desc: 'Export cleaned CSV, save charts as PNG, or download stats as CSV.' },
];

const EXAMPLES = [
  { label: '🧹 Cleaning', color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe', commands: [
    'remove outliers in cholesterol',
    'fill missing values with median in age',
    'normalize trestbps',
    'drop duplicate rows',
  ]},
  { label: '📊 Visualization', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', commands: [
    'show correlation heatmap',
    'plot distribution of age',
    'scatter plot of age vs chol',
    'show 3 clusters of trestbps and chol',
  ]},
  { label: '📈 Statistics', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', commands: [
    'describe the dataset',
    'statistics for age',
    'show mean and median of cholesterol',
    'summarize trestbps',
  ]},
  { label: '🤖 ML Training', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', commands: [
    'Random Forest (auto-detects task)',
    'Logistic Regression (classification)',
    'Linear Regression (regression)',
    'Feature importance + confusion matrix',
  ]},
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <main style={{ maxWidth: '860px', margin: '3.5rem auto', padding: '0 1.5rem', textAlign: 'center' }}>

      {/* Hero */}
      <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#111827', marginBottom: '0.75rem' }}>
        🧹 NL Dataset Cleaner
      </h1>
      <p style={{ fontSize: '1.1rem', color: '#6b7280', marginBottom: '0.5rem', lineHeight: 1.6 }}>
        Clean, transform, and <strong style={{ color: '#0891b2' }}>visualize</strong> any CSV using plain English.
      </p>
      <p style={{ fontSize: '0.95rem', color: '#9ca3af', marginBottom: '2.5rem' }}>
        Powered by <strong style={{ color: '#4f46e5' }}>Llama 3.2 (Ollama)</strong> + FastAPI + React
      </p>

      <button
        onClick={() => navigate('/upload')}
        style={{ padding: '0.9rem 2.5rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '10px', fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(79,70,229,0.35)', marginBottom: '3rem' }}
      >
        Get Started →
      </button>

      {/* Example commands */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2.5rem', textAlign: 'left' }}>
        {EXAMPLES.map(({ label, color, bg, border, commands }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: '10px', padding: '1.1rem 1.25rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.82rem', color, marginBottom: '0.65rem', letterSpacing: '0.03em' }}>
              {label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {commands.map(cmd => (
                <div key={cmd} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color, fontSize: '0.7rem' }}>▶</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#374151' }}>"{cmd}"</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Feature cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.85rem', textAlign: 'left' }}>
        {FEATURES.map(({ icon, title, desc }) => (
          <div key={title} style={{ padding: '1.1rem', background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px' }}>
            <div style={{ fontSize: '1.35rem', marginBottom: '0.4rem' }}>{icon}</div>
            <h3 style={{ fontWeight: 700, fontSize: '0.88rem', color: '#111827', margin: '0 0 0.3rem' }}>{title}</h3>
            <p style={{ color: '#6b7280', fontSize: '0.8rem', margin: 0, lineHeight: 1.5 }}>{desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
