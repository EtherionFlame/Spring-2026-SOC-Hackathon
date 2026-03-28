import { useState } from 'react';
import { runPrediction } from '../api';

export default function Predict() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await runPrediction({ input });
      setResult(data.result);
    } catch (err) {
      setError('Prediction failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: '2rem', maxWidth: 600, margin: '0 auto' }}>
      <h2>Run Prediction</h2>
      <form onSubmit={handleSubmit} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <textarea
          rows={4}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter your input here..."
          style={{ padding: '0.75rem', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '1rem' }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '0.75rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
        >
          {loading ? 'Running...' : 'Predict'}
        </button>
      </form>
      {error && <p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>}
      {result && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f0fdf4', borderRadius: 8, border: '1px solid #86efac' }}>
          <strong>Result:</strong>
          <pre style={{ marginTop: '0.5rem' }}>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </main>
  );
}
