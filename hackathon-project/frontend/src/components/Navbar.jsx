import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav style={{ padding: '1rem 2rem', background: '#1f2937', color: 'white', display: 'flex', gap: '1.5rem' }}>
      <Link to="/" style={{ color: 'white', textDecoration: 'none', fontWeight: 600 }}>🏠 Home</Link>
      <Link to="/predict" style={{ color: 'white', textDecoration: 'none' }}>⚡ Predict</Link>
    </nav>
  );
}
