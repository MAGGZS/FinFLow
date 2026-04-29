import { useNavigate, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/');
  };

  const links = [
    { path: '/admin',          icon: '◈', label: 'Dashboard' },
    { path: '/admin/usuarios', icon: '◉', label: 'Usuários'  },
  ];

  return (
    <aside className="dash-sidebar">
      <div className="dash-logo">FinFlow</div>
      <div className="dash-sidebar-label">Painel Admin</div>

      <nav className="dash-nav">
        {links.map(l => (
          <div
            key={l.path}
            className={`dash-nav-item${pathname === l.path ? ' active' : ''}`}
            onClick={() => navigate(l.path)}
          >
            <span>{l.icon}</span> {l.label}
          </div>
        ))}
      </nav>

      <div className="dash-sidebar-footer">
        <div className="dash-admin-info">
          <div className="dash-admin-avatar">
            {(usuario.nome || 'A').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="dash-admin-name">{usuario.nome || 'Admin'}</div>
            <div className="dash-admin-role">Administrador</div>
          </div>
        </div>
        <button className="dash-logout" onClick={handleLogout}>← Sair</button>
      </div>
    </aside>
  );
}
