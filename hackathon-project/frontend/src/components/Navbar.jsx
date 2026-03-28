import { Link, useLocation } from 'react-router-dom';

const links = [
  { to: '/', label: '🏠 Home' },
  { to: '/upload', label: '📂 Upload' },
];

export default function Navbar() {
  const { pathname } = useLocation();

  return (
    <nav
      style={{
        padding: '0.875rem 2rem',
        background: '#1f2937',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
      }}
    >
      {/* Brand */}
      <span style={{ fontWeight: 700, fontSize: '1rem', marginRight: '1.5rem', color: '#a5b4fc' }}>
        🧹 NL Dataset Cleaner
      </span>

      {links.map(({ to, label }) => {
        const active = pathname === to || (to !== '/' && pathname.startsWith(to));
        return (
          <Link
            key={to}
            to={to}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '6px',
              color: active ? 'white' : '#9ca3af',
              background: active ? '#374151' : 'transparent',
              textDecoration: 'none',
              fontWeight: active ? 600 : 400,
              fontSize: '0.9rem',
              transition: 'all 0.15s',
            }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
