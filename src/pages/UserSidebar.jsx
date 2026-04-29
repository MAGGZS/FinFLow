import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, TrendingDown, TrendingUp, Tag, LogOut, ChevronLeft, ChevronRight, Wallet } from 'lucide-react';
import '../components/Sidebar.css';

export default function UserSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/');
  };

  const links = [
    { path: '/app',            icon: <LayoutDashboard size={18}/>, label: 'Dashboard'  },
    { path: '/app/gastos',     icon: <TrendingDown size={18}/>,    label: 'Gastos'     },
    { path: '/app/receitas',   icon: <TrendingUp size={18}/>,      label: 'Receitas'   },
    { path: '/app/categorias', icon: <Tag size={18}/>,             label: 'Categorias' },
  ];

  return (
    <>
      <aside className={`sidebar${collapsed ? ' sidebar-collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon"><Wallet size={16}/></div>
            <span className="sidebar-brand-name">FinFlow</span>
          </div>
          <button className="sidebar-toggle" onClick={() => setCollapsed(c => !c)}>
            {collapsed ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
          </button>
        </div>

        <div className="sidebar-label">{!collapsed && 'Minhas Finanças'}</div>

        <nav className="sidebar-nav">
          {links.map(l => (
            <div
              key={l.path}
              className={`sidebar-item${pathname === l.path ? ' active' : ''}`}
              onClick={() => navigate(l.path)}
              data-tooltip={l.label}
            >
              <span className="sidebar-item-icon">{l.icon}</span>
              <span className="sidebar-item-label">{l.label}</span>
              {pathname === l.path && <span className="sidebar-item-dot"/>}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user" data-tooltip={usuario.nome}>
            <div className="sidebar-avatar">
              {(usuario.nome || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{usuario.nome || 'Usuário'}</div>
              <div className="sidebar-user-role">Conta pessoal</div>
            </div>
          </div>
          <button className="sidebar-logout" onClick={handleLogout} data-tooltip="Sair">
            <LogOut size={15}/>
            <span className="sidebar-item-label">Sair</span>
          </button>
        </div>
      </aside>
      <div className={`sidebar-spacer${collapsed ? ' sidebar-spacer-collapsed' : ''}`}/>
    </>
  );
}
