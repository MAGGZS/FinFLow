import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut } from 'lucide-react';

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
    { path: '/admin',          icon: <LayoutDashboard size={16}/>, label: 'Dashboard' },
    { path: '/admin/usuarios', icon: <Users size={16}/>,           label: 'Usuários'  },
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
            {l.icon} {l.label}
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
        <button className="dash-logout" onClick={handleLogout}>
          <LogOut size={13}/> Sair
        </button>
      </div>
    </aside>
  );
}
