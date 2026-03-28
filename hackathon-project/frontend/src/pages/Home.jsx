import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  const features = [
    { icon: '📂', title: 'Upload Any CSV', desc: 'Drag and drop your dataset and get an instant preview.' },
    { icon: '🧠', title: 'Plain-English Commands', desc: 'Type "remove outliers in cholesterol" — no code needed.' },
    { icon: '🔒', title: 'Safe by Design', desc: 'All operations are whitelisted. No eval(), ever.' },
    { icon: '📊', title: 'Before & After Diff', desc: 'See exactly what changed before you commit.' },
  ];

  return (
    <main style={{ maxWidth: '800px', margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#111827', marginBottom: '1rem' }}>
        🧹 NL Dataset Cleaner
      </h1>
      <p style={{ fontSize: '1.125rem', color: '#6b7280', marginBottom: '2.5rem', lineHeight: 1.6 }}>
        Clean messy CSVs using plain English. Powered by{' '}
        <strong style={{ color: '#4f46e5' }}>Llama 3 (Ollama)</strong> + FastAPI + React.
      </p>

      <button
        onClick={() => navigate('/upload')}
        style={{
          padding: '0.9rem 2.5rem',
          background: '#4f46e5',
          color: 'white',
          border: 'none',
          borderRadius: '10px',
          fontSize: '1.05rem',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(79,70,229,0.35)',
          marginBottom: '3.5rem',
        }}
      >
        Get Started →
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', textAlign: 'left' }}>
        {features.map(({ icon, title, desc }) => (
          <div
            key={title}
            style={{
              padding: '1.25rem',
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '10px',
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>{icon}</div>
            <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827', margin: '0 0 0.3rem' }}>{title}</h3>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>{desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
