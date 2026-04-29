import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import Toast, { useToast } from './Toast';

const BASE_URL = 'https://finflow-j1ca.onrender.com';
const MONTHS_LABEL = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [chartView, setChartView] = useState('week');
  const [loading, setLoading] = useState(true);
  const { toasts, show: toast } = useToast();

  useEffect(() => {
    const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
    if (!usuario?.admin) { navigate('/'); return; }
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/admin/stats`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error('Erro ao carregar dados.');
      const data = await res.json();
      setStats(data);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getChartPoints = () => {
    if (!stats) return [];
    if (chartView === 'week') {
      // Últimos 7 dias dos cadastrosDia
      return stats.cadastrosDia.slice(-7).map(d => ({
        label: new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }),
        value: d.count,
        isToday: d.date === new Date().toISOString().slice(0, 10),
      }));
    }
    // Últimos 12 meses
    return stats.cadastrosMes.map(d => ({
      label: MONTHS_LABEL[parseInt(d.month.split('-')[1]) - 1],
      value: d.count,
      isToday: d.month === `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`,
    }));
  };

  const renderChart = () => {
    const pts_data = getChartPoints();
    if (!pts_data.length) return null;

    const W = 800, H = 240, P = 50;
    const cW = W - P * 2, cH = H - P * 2;
    const max = Math.max(...pts_data.map(d => d.value), 1);

    const pts = pts_data.map((d, i) => ({
      x: P + (i * cW) / (pts_data.length - 1),
      y: P + cH - (d.value / max) * cH,
      ...d,
    }));

    const path = pts.reduce((acc, p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = pts[i - 1];
      return `${acc} C ${prev.x + (p.x - prev.x) * 0.4} ${prev.y}, ${p.x - (p.x - prev.x) * 0.4} ${p.y}, ${p.x} ${p.y}`;
    }, '');
    const areaPath = `${path} L ${pts[pts.length-1].x} ${P+cH} L ${pts[0].x} ${P+cH} Z`;

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="dash-chart-svg">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(168,155,242,0.3)"/>
            <stop offset="100%" stopColor="rgba(168,155,242,0)"/>
          </linearGradient>
        </defs>
        {[0,1,2,3,4].map(i => (
          <line key={i} x1={P} y1={P+(i*cH)/4} x2={W-P} y2={P+(i*cH)/4}
            stroke="rgba(168,155,242,0.08)" strokeWidth="1"/>
        ))}
        <path d={areaPath} fill="url(#chartGrad)"/>
        <path d={path} fill="none" stroke="var(--purple-primary)" strokeWidth="2.5" strokeLinecap="round"/>
        {pts.map((p, i) => (
          <g key={i}>
            {p.isToday && <circle cx={p.x} cy={p.y} r="7" fill="var(--purple-primary)" opacity="0.15"/>}
            <circle cx={p.x} cy={p.y} r="3.5" fill={p.isToday ? 'var(--purple-primary)' : 'var(--accent)'}/>
            <text x={p.x} y={H-10} textAnchor="middle" fontSize="11"
              fill={p.isToday ? 'var(--purple-light)' : 'rgba(168,155,242,0.45)'}
              fontWeight={p.isToday ? '700' : '400'}>{p.label}</text>
            {p.value > 0 && (
              <text x={p.x} y={p.y-10} textAnchor="middle" fontSize="11"
                fill="var(--purple-light)" fontWeight="600">{p.value}</text>
            )}
          </g>
        ))}
      </svg>
    );
  };

  const cards = [
    { label: 'Total de Usuários',  value: stats?.total,        icon: '👥', color: 'purple', sub: `+${stats?.novosSemana ?? 0} esta semana` },
    { label: 'Usuários Ativos',    value: stats?.ativos,       icon: '✓',  color: 'green',  sub: stats ? `${Math.round((stats.ativos/stats.total)*100)||0}% do total` : '' },
    { label: 'Usuários Inativos',  value: stats?.inativos,     icon: '✕',  color: 'red',    sub: stats ? `${Math.round((stats.inativos/stats.total)*100)||0}% do total` : '' },
    { label: 'Novos Hoje',         value: stats?.novosHoje,    icon: '🆕', color: 'accent', sub: `+${stats?.novosSemana ?? 0} nos últimos 7 dias` },
  ];

  return (
    <>
      <Toast toasts={toasts} />
      <div className="dash-topbar">
        <div>
          <div className="dash-title">Dashboard</div>
          <div className="dash-subtitle">Visão geral da plataforma · FinFlow</div>
        </div>
        <button className="dash-refresh-btn" onClick={loadStats} disabled={loading}>
          <span className={loading ? 'spin' : ''}>↻</span> Atualizar
        </button>
      </div>

      <div className="dash-stats">
        {cards.map(s => (
          <div key={s.label} className={`dash-stat-card dash-stat-${s.color}`}>
            <div className="dash-stat-top">
              <div className="dash-stat-icon">{s.icon}</div>
              <div className="dash-stat-value">{loading ? '—' : (s.value ?? 0)}</div>
            </div>
            <div className="dash-stat-label">{s.label}</div>
            {s.sub && <div className="dash-stat-sub">{loading ? '' : s.sub}</div>}
          </div>
        ))}
      </div>

      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Cadastros de usuários</span>
          <div className="dash-toggle-group">
            <button className={`dash-toggle${chartView==='week'?' active':''}`} onClick={() => setChartView('week')}>7 dias</button>
            <button className={`dash-toggle${chartView==='month'?' active':''}`} onClick={() => setChartView('month')}>12 meses</button>
          </div>
        </div>
        <div className="dash-chart-wrap">
          {loading
            ? <div className="dash-loading"><div className="dash-spinner"/></div>
            : stats?.cadastrosDia?.length
              ? renderChart()
              : <div className="dash-chart-empty">Sem dados suficientes para exibir o gráfico.</div>
          }
        </div>
      </div>

      <div className="dash-card" style={{ marginBottom: 32 }}>
        <div className="dash-card-header">
          <span className="dash-card-title">Últimos cadastros</span>
          <button className="dash-link-btn" onClick={() => navigate('/admin/usuarios')}>
            Ver todos →
          </button>
        </div>
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr><th>Nome</th><th>Email</th><th>Perfil</th><th>Status</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="dash-table-empty">Carregando...</td></tr>
              ) : !stats ? (
                <tr><td colSpan="4" className="dash-table-empty">Sem dados.</td></tr>
              ) : (
                <tr><td colSpan="4" className="dash-table-empty">
                  Acesse <button className="dash-link-inline" onClick={() => navigate('/admin/usuarios')}>Usuários</button> para ver a lista completa.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
