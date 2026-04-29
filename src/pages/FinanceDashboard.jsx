import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Wallet, RefreshCw, Plus, X } from 'lucide-react';
import Toast, { useToast } from '../components/Toast';
import RendaModal from './RendaModal';
import './FinanceDashboard.css';

const BASE_URL = import.meta.env.VITE_API_URL;
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

function LancamentoModal({ tipo, categorias, onSave, onCancel }) {
  const hoje = new Date().toISOString().slice(0, 10);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(hoje);
  const [categoriaId, setCategoriaId] = useState('');
  const [saving, setSaving] = useState(false);

  const isGasto = tipo === 'gasto';
  const catsFiltradas = categorias.filter(c => c.tipo === (isGasto ? 'gasto' : 'receita'));

  const handleSubmit = async () => {
    if (!descricao.trim()) return;
    const v = parseFloat(valor.replace(',', '.'));
    if (!v || v <= 0) return;
    setSaving(true);
    await onSave({ descricao, valor: v, data, categoria_id: categoriaId || null });
    setSaving(false);
  };

  const accentColor = isGasto ? '#ef4444' : '#10b981';
  const accentBg    = isGasto ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)';
  const accentBorder= isGasto ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)';

  return (
    <div className="usr-modal-overlay" onClick={onCancel}>
      <div className="usr-modal-box usr-modal-edit" onClick={e => e.stopPropagation()}>

        <div className="fd-lm-header" style={{ borderColor: accentBorder }}>
          <div className="fd-lm-icon" style={{ background: accentBg, border: `1px solid ${accentBorder}`, color: accentColor }}>
            {isGasto ? <TrendingDown size={20}/> : <TrendingUp size={20}/>}
          </div>
          <div>
            <div className="usr-modal-title" style={{ textAlign: 'left', marginBottom: 2 }}>
              {isGasto ? 'Registrar Gasto' : 'Registrar Receita'}
            </div>
            <div className="usr-modal-id">{isGasto ? 'Nova despesa' : 'Novo ganho'}</div>
          </div>
        </div>

        <div className="usr-modal-section-label">Informações</div>

        <div className="usr-edit-field">
          <label>Descrição</label>
          <input placeholder={isGasto ? 'Ex: Almoço, Uber...' : 'Ex: Salário, Freelance...'}
            value={descricao} onChange={e => setDescricao(e.target.value)} autoFocus/>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="usr-edit-field">
            <label>Valor (R$)</label>
            <input type="number" placeholder="0,00" value={valor} onChange={e => setValor(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}/>
          </div>
          <div className="usr-edit-field">
            <label>Data</label>
            <input type="date" value={data} onChange={e => setData(e.target.value)}
              style={{ colorScheme: 'dark' }}/>
          </div>
        </div>

        <div className="usr-modal-section-label">Categoria</div>
        <div className="fd-lm-cats">
          <div
            className={`fd-lm-cat${!categoriaId ? ' fd-lm-cat-active' : ''}`}
            onClick={() => setCategoriaId('')}
          >
            📦 Sem categoria
          </div>
          {catsFiltradas.map(c => (
            <div
              key={c.id}
              className={`fd-lm-cat${categoriaId === String(c.id) ? ' fd-lm-cat-active' : ''}`}
              style={categoriaId === String(c.id) ? { borderColor: c.cor, background: c.cor + '18', color: c.cor } : {}}
              onClick={() => setCategoriaId(String(c.id))}
            >
              {c.icone} {c.nome}
            </div>
          ))}
        </div>

        <div className="usr-modal-actions">
          <button className="usr-btn-cancel" onClick={onCancel} disabled={saving}>Cancelar</button>
          <button className="usr-btn-save" onClick={handleSubmit} disabled={saving || !descricao || !valor}
            style={{ background: `linear-gradient(135deg, ${accentColor}, ${isGasto ? '#dc2626' : '#059669'})` }}>
            {saving ? 'Salvando...' : isGasto ? 'Registrar gasto' : 'Registrar receita'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FinanceDashboard() {
  const navigate = useNavigate();
  const { toasts, show: toast } = useToast();
  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');

  const now = new Date();
  const [ano, setAno] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [resumo, setResumo] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [extrato, setExtrato] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRendaModal, setShowRendaModal] = useState(false);
  const [orcamentoId, setOrcamentoId] = useState(null);
  const [fabOpen, setFabOpen] = useState(false);
  const [modalTipo, setModalTipo] = useState(null); // 'gasto' | 'receita'
  const [categorias, setCategorias] = useState([]);
  const fabRef = useRef(null);

  useEffect(() => {
    if (!usuario) { navigate('/'); return; }
    loadDashboard();
    loadCategorias();
  }, [ano, mes]);

  useEffect(() => {
    const close = (e) => { if (fabRef.current && !fabRef.current.contains(e.target)) setFabOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/finance/resumo?ano=${ano}&mes=${mes}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setResumo(data);
      setOrcamentoId(data.orcamento.id);

      // Primeira vez: renda_base = 0 → pede renda
      if (Number(data.renda_base) === 0 && data.total_gastos === 0) {
        setShowRendaModal(true);
      }

      // Extrato: gastos + rendas juntos ordenados por data
      const [gastosRes, rendasRes] = await Promise.all([
        fetch(`${BASE_URL}/finance/orcamento/${data.orcamento.id}/gastos`, { headers }).then(r => r.json()),
        fetch(`${BASE_URL}/finance/orcamento/${data.orcamento.id}/rendas`, { headers }).then(r => r.json()),
      ]);

      const gastosList = (Array.isArray(gastosRes) ? gastosRes : []).map(g => ({
        ...g, tipo: 'gasto', data: g.data_gasto,
      }));
      const rendasList = (Array.isArray(rendasRes) ? rendasRes : []).map(r => ({
        ...r, tipo: 'receita', data: r.recebido_em,
      }));

      const extratoOrdenado = [...gastosList, ...rendasList]
        .sort((a, b) => new Date(b.data) - new Date(a.data));

      setExtrato(extratoOrdenado);

      // Histórico dos últimos 6 meses
      const promises = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(ano, mes - 1 - i, 1);
        promises.push(
          fetch(`${BASE_URL}/finance/resumo?ano=${d.getFullYear()}&mes=${d.getMonth() + 1}`, { headers })
            .then(r => r.json())
        );
      }
      const hist = await Promise.all(promises);
      setHistorico(hist);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCategorias = async () => {
    try {
      const res = await fetch(`${BASE_URL}/finance/categorias`, { headers });
      const data = await res.json();
      setCategorias(Array.isArray(data) ? data : []);
    } catch {}
  };

  const handleSalvarLancamento = async (tipo, form) => {
    try {
      const url = tipo === 'gasto'
        ? `${BASE_URL}/finance/orcamento/${orcamentoId}/gastos`
        : `${BASE_URL}/finance/orcamento/${orcamentoId}/rendas`;

      const body = tipo === 'gasto'
        ? { descricao: form.descricao, valor: form.valor, data_gasto: form.data, categoria_id: form.categoria_id || null, recorrente: false }
        : { descricao: form.descricao, valor: form.valor, recebido_em: form.data, categoria_id: form.categoria_id || null };

      const res = await fetch(url, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setModalTipo(null);
      toast(tipo === 'gasto' ? 'Gasto registrado!' : 'Receita registrada!', 'success');
      loadDashboard();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const handleConfirmRenda = async (valor) => {
    try {
      const res = await fetch(`${BASE_URL}/finance/orcamento/${orcamentoId}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ renda_base: valor }),
      });
      if (!res.ok) throw new Error('Erro ao salvar renda.');
      setShowRendaModal(false);
      loadDashboard();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  // Gráfico pizza SVG
  const PieChart = ({ data }) => {
    if (!data?.length) return <div className="fd-chart-empty">Sem gastos este mês</div>;
    const total = data.reduce((s, d) => s + d.total, 0);
    let angle = 0;
    const slices = data.map(d => {
      const pct = d.total / total;
      const start = angle;
      angle += pct * 360;
      return { ...d, pct, start, end: angle };
    });

    const polarToXY = (deg, r) => {
      const rad = (deg - 90) * Math.PI / 180;
      return { x: 50 + r * Math.cos(rad), y: 50 + r * Math.sin(rad) };
    };

    return (
      <div className="fd-pie-wrap">
        <svg viewBox="0 0 100 100" className="fd-pie-svg">
          {slices.map((s, i) => {
            const p1 = polarToXY(s.start, 38);
            const p2 = polarToXY(s.end, 38);
            const large = s.pct > 0.5 ? 1 : 0;
            return (
              <path key={i}
                d={`M50,50 L${p1.x},${p1.y} A38,38 0 ${large},1 ${p2.x},${p2.y} Z`}
                fill={s.cor || '#A89BF2'}
                opacity="0.85"
                stroke="rgba(5,5,5,0.8)"
                strokeWidth="0.5"
              />
            );
          })}
          <circle cx="50" cy="50" r="22" fill="rgba(5,5,5,0.95)"/>
          <text x="50" y="47" textAnchor="middle" fontSize="7" fill="rgba(168,155,242,0.5)" fontWeight="600">GASTOS</text>
          <text x="50" y="56" textAnchor="middle" fontSize="6.5" fill="var(--purple-light)" fontWeight="700">
            {resumo?.percentual_gasto ?? 0}%
          </text>
        </svg>
        <div className="fd-pie-legend">
          {slices.map((s, i) => (
            <div key={i} className="fd-legend-item">
              <span className="fd-legend-dot" style={{ background: s.cor || '#A89BF2' }}/>
              <span className="fd-legend-name">{s.icone} {s.nome}</span>
              <span className="fd-legend-val">{fmt(s.total)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Gráfico barras SVG
  const BarChart = ({ data }) => {
    if (!data?.length) return null;
    const max = Math.max(...data.map(d => d.total_gastos || 0), 1);
    return (
      <svg viewBox="0 0 300 120" className="fd-bar-svg">
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--purple-primary)" stopOpacity="0.9"/>
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.5"/>
          </linearGradient>
        </defs>
        {[0,1,2,3].map(i => (
          <line key={i} x1="30" y1={10 + i*25} x2="295" y2={10 + i*25}
            stroke="rgba(168,155,242,0.06)" strokeWidth="1"/>
        ))}
        {data.map((d, i) => {
          const barH = Math.max(((d.total_gastos || 0) / max) * 80, 2);
          const x = 38 + i * 44;
          const y = 95 - barH;
          const isAtual = i === data.length - 1;
          return (
            <g key={i}>
              <rect x={x} y={y} width="28" height={barH} rx="4"
                fill={isAtual ? 'url(#barGrad)' : 'rgba(168,155,242,0.2)'}/>
              <text x={x+14} y="112" textAnchor="middle" fontSize="8"
                fill={isAtual ? 'var(--purple-light)' : 'rgba(168,155,242,0.4)'}
                fontWeight={isAtual ? '700' : '400'}>
                {MESES[(d.mes || 1) - 1]}
              </text>
              {(d.total_gastos || 0) > 0 && (
                <text x={x+14} y={y-4} textAnchor="middle" fontSize="6.5"
                  fill="rgba(168,155,242,0.6)">
                  {fmt(d.total_gastos).replace('R$\u00a0','')}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="fd-page">
      <Toast toasts={toasts}/>
      {showRendaModal && <RendaModal onConfirm={handleConfirmRenda}/>}
      {modalTipo && <LancamentoModal tipo={modalTipo} categorias={categorias} onSave={(f) => handleSalvarLancamento(modalTipo, f)} onCancel={() => setModalTipo(null)}/>}

      {/* Topbar */}
      <div className="fd-topbar">
        <div>
          <div className="fd-title">Dashboard</div>
          <div className="fd-subtitle">
            {MESES[mes-1]} {ano} · Olá, {usuario?.nome?.split(' ')[0]} 👋
          </div>
        </div>
        <div className="fd-topbar-right">
          <select className="fd-select" value={mes} onChange={e => setMes(+e.target.value)}>
            {MESES.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select className="fd-select" value={ano} onChange={e => setAno(+e.target.value)}>
            {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="fd-refresh" onClick={loadDashboard} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''}/>
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="fd-cards">
        {[
          { label: 'Renda Total',    value: resumo?.renda_total,  icon: <Wallet size={18}/>,      color: 'purple' },
          { label: 'Total Gasto',    value: resumo?.total_gastos, icon: <TrendingDown size={18}/>, color: 'red'    },
          { label: 'Disponível',     value: resumo?.saldo,        icon: <TrendingUp size={18}/>,   color: 'green'  },
        ].map(c => (
          <div key={c.label} className={`fd-card fd-card-${c.color}`}>
            <div className="fd-card-top">
              <div className="fd-card-icon">{c.icon}</div>
              <div className="fd-card-value">{loading ? '—' : fmt(c.value)}</div>
            </div>
            <div className="fd-card-label">{c.label}</div>
            {c.color === 'green' && resumo && (
              <div className="fd-card-sub">
                {resumo.percentual_gasto}% da renda utilizado
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="fd-charts">
        <div className="fd-chart-card">
          <div className="fd-chart-header">
            <span className="fd-chart-title">Gastos por categoria</span>
          </div>
          <div className="fd-chart-body">
            {loading
              ? <div className="fd-loading"><div className="dash-spinner"/></div>
              : <PieChart data={resumo?.por_categoria}/>
            }
          </div>
        </div>

        <div className="fd-chart-card">
          <div className="fd-chart-header">
            <span className="fd-chart-title">Gastos dos últimos 6 meses</span>
          </div>
          <div className="fd-chart-body">
            {loading
              ? <div className="fd-loading"><div className="dash-spinner"/></div>
              : <BarChart data={historico}/>
            }
          </div>
        </div>
      </div>

      {/* Extrato */}
      <div className="fd-table-card">
        <div className="fd-chart-header">
          <span className="fd-chart-title">Movimentação geral</span>
          <span className="fd-badge">{extrato.length} lançamentos</span>
        </div>

        {/* Cabeçalho do extrato */}
        <div className="fd-extrato-head">
          <span>Data</span>
          <span>Descrição</span>
          <span>Categoria</span>
          <span>Tipo</span>
          <span style={{textAlign:'right'}}>Valor</span>
        </div>

        <div className="fd-extrato-body">
          {loading ? (
            <div className="fd-loading"><div className="dash-spinner"/></div>
          ) : extrato.length === 0 ? (
            <div className="fd-empty">Nenhuma movimentação registrada este mês.</div>
          ) : extrato.map((item, i) => {
            const isReceita = item.tipo === 'receita';
            const cat = item.categorias;
            return (
              <div key={item.id} className={`fd-extrato-row${i % 2 === 0 ? ' fd-extrato-row-alt' : ''}`}>
                <span className="fd-ext-date">
                  {new Date(item.data + 'T12:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'short' })}
                </span>
                <span className="fd-ext-desc">{item.descricao}</span>
                <span className="fd-ext-cat">
                  {cat ? (
                    <span className="fd-ext-cat-badge" style={{ background: (cat.cor||'#888')+'22', border: `1px solid ${cat.cor||'#888'}44`, color: cat.cor||'#888' }}>
                      {cat.icone} {cat.nome}
                    </span>
                  ) : <span className="fd-ext-cat-none">—</span>}
                </span>
                <span>
                  <span className={`fd-ext-tipo ${isReceita ? 'fd-tipo-receita' : 'fd-tipo-gasto'}`}>
                    {isReceita ? '↑ Receita' : '↓ Gasto'}
                  </span>
                </span>
                <span className={`fd-ext-val ${isReceita ? 'fd-val-pos' : 'fd-val-neg'}`}>
                  {isReceita ? '+' : '-'} {fmt(item.valor)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {/* FAB */}
      <div className="fd-fab-wrap" ref={fabRef}>
        <div className={`fd-fab-menu${fabOpen ? ' open' : ''}`}>
          <button className="fd-fab-option fd-fab-receita" onClick={() => { setModalTipo('receita'); setFabOpen(false); }}>
            <TrendingUp size={15}/> Receita
          </button>
          <button className="fd-fab-option fd-fab-gasto" onClick={() => { setModalTipo('gasto'); setFabOpen(false); }}>
            <TrendingDown size={15}/> Gasto
          </button>
        </div>
        <button className={`fd-fab${fabOpen ? ' fd-fab-active' : ''}`} onClick={() => setFabOpen(o => !o)}>
          {fabOpen ? <X size={22}/> : <Plus size={22}/>}
        </button>
      </div>
    </div>
  );
}
