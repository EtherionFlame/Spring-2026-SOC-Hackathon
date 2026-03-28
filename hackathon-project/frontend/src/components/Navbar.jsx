import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_LINKS = [
  { to: '/', label: '🏠 Home' },
  { to: '/upload', label: '📂 Upload' },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { token, user, logout } = useAuth();

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

  return (
    <nav style={{ padding: '0.875rem 2rem', background: '#1f2937', color: 'white', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
      {/* Brand */}
      <span style={{ fontWeight: 700, fontSize: '1rem', marginRight: '1.5rem', color: '#a5b4fc' }}>
        🧹 NL Dataset Cleaner
      </span>

      {/* Nav links */}
      {NAV_LINKS.map(({ to, label }) => {
        const active = pathname === to || (to !== '/' && pathname.startsWith(to));
        return (
          <Link key={to} to={to} style={{ padding: '0.4rem 0.85rem', borderRadius: '6px', color: active ? 'white' : '#9ca3af', background: active ? '#374151' : 'transparent', textDecoration: 'none', fontWeight: active ? 600 : 400, fontSize: '0.9rem' }}>
            {label}
          </Link>
        );
      })}
      {token && (
        <Link to="/history" style={{ padding: '0.4rem 0.85rem', borderRadius: '6px', color: pathname === '/history' ? 'white' : '#9ca3af', background: pathname === '/history' ? '#374151' : 'transparent', textDecoration: 'none', fontWeight: pathname === '/history' ? 600 : 400, fontSize: '0.9rem' }}>
          📜 History
        </Link>
      )}

      {/* Auth — pushed to the right */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {token ? (
          <>
            <span style={{ fontSize: '0.82rem', color: '#9ca3af' }}>
              {user?.email}
            </span>
            <button
              onClick={handleLogout}
              style={{ padding: '0.35rem 0.8rem', background: 'transparent', border: '1px solid #4b5563', borderRadius: '6px', color: '#d1d5db', fontSize: '0.82rem', cursor: 'pointer' }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" style={{ padding: '0.35rem 0.8rem', color: '#9ca3af', textDecoration: 'none', fontSize: '0.875rem' }}>
              Login
            </Link>
            <Link to="/register" style={{ padding: '0.35rem 0.8rem', background: '#4f46e5', color: 'white', borderRadius: '6px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
