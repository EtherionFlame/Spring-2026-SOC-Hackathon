import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadCSV } from '../api';

export default function Upload() {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef();
  const navigate = useNavigate();

  // ── File selection ────────────────────────────────────────────────────────

  function handleFileChange(e) {
    const selected = e.target.files[0];
    validateAndSet(selected);
  }

  function validateAndSet(selected) {
    setError('');
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a valid .csv file.');
      return;
    }
    setFile(selected);
  }

  // ── Drag & drop ───────────────────────────────────────────────────────────

  function handleDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    validateAndSet(dropped);
  }

  // ── Upload ────────────────────────────────────────────────────────────────

  async function handleUpload() {
    if (!file) {
      setError('Please select a CSV file first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await uploadCSV(file);
      // Pass session data to dashboard via navigation state
      navigate(`/dashboard/${data.session_id}`, { state: { session: data } });
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        'Upload failed. Make sure the backend is running.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  // ── Styles ────────────────────────────────────────────────────────────────

  const dropzoneStyle = {
    border: `2px dashed ${dragging ? '#6366f1' : '#d1d5db'}`,
    borderRadius: '12px',
    padding: '3rem 2rem',
    textAlign: 'center',
    cursor: 'pointer',
    background: dragging ? '#eef2ff' : '#f9fafb',
    transition: 'all 0.2s ease',
  };

  return (
    <main style={{ maxWidth: '600px', margin: '4rem auto', padding: '0 1.5rem' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        📂 Upload CSV
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        Upload a CSV file and start cleaning it with plain-English commands.
      </p>

      {/* Drop zone */}
      <div
        style={dropzoneStyle}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current.click()}
        role="button"
        aria-label="Upload CSV file"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        {file ? (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
            <p style={{ fontWeight: 600, color: '#111827' }}>{file.name}</p>
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              {(file.size / 1024).toFixed(1)} KB — click or drop to replace
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>☁️</div>
            <p style={{ fontWeight: 600, color: '#374151' }}>
              Drag & drop your CSV here
            </p>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              or click to browse files
            </p>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            color: '#dc2626',
            fontSize: '0.875rem',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={!file || loading}
        style={{
          marginTop: '1.5rem',
          width: '100%',
          padding: '0.875rem',
          background: file && !loading ? '#4f46e5' : '#c7d2fe',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: file && !loading ? 'pointer' : 'not-allowed',
          transition: 'background 0.2s',
        }}
      >
        {loading ? '⏳ Uploading…' : '🚀 Upload & Preview'}
      </button>
    </main>
  );
}
