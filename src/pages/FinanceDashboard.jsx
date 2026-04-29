import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Wallet, RefreshCw, Plus, X, PiggyBank } from 'lucide-react';
import Toast, { useToast } from '../components/Toast';
import RendaModal from './RendaModal';
import LancamentoModal from './LancamentoModal';
import './FinanceDashboard.css';

const BASE_URL = import.meta.env.VITE_API_URL;
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const toXY = (deg, r) => {
  const rad = (deg - 90) * Math.PI / 180;
  return { x: 50 + r * Math.cos(rad), y: 50 + r * Math.sin(rad) };
};

export default function FinanceDashboard() {
  const navigate = useNavigate();
  const { toasts, show: toast } = useToast();
  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
  const fabRef = useRef(null);

  const now = new Date();
  const [ano, setAno]           = useState(now.getFullYear());
  const [mes, setMes]           = useState(now.getMonth() + 1);
  const [resumo, setResumo]     = useState(null);
  const [historico, setHistorico] = useState([]);
  const [extrato, setExtrato]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showRendaModal, setShowRendaModal] = useState(false);
  const [orcamentoId, setOrcamentoId] = useState(null);
  const [fabOpen, setFabOpen]   = useState(false);
  const [modalTipo, setModalTipo] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [paginaExtrato, setPaginaExtrato] = useState(1);
  const [renderKey, setRenderKey] = useState(0);
  const [hovSlice, setHovSlice] = useState(null);
  const [hovBar, setHovBar]     = useState(null);
  const POR_PAGINA = 10;

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
    setHovSlice(null);
    setHovBar(null);
    try {
      const res = await fetch(`${BASE_URL}/finance/resumo?ano=${ano}&mes=${mes}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setResumo(data);
      setOrcamentoId(data.orcamento.id);
      if (Number(data.renda_base) === 0 && data.total_gastos === 0) setShowRendaModal(true);

      const [gastosRes, rendasRes] = await Promise.all([
        fetch(`${BASE_URL}/finance/orcamento/${data.orcamento.id}/gastos`, { headers }).then(r => r.json()),
        fetch(`${BASE_URL}/finance/orcamento/${data.orcamento.id}/rendas`, { headers }).then(r => r.json()),
      ]);

      const gastosList = (Array.isArray(gastosRes) ? gastosRes : []).map(g => ({ ...g, tipo: 'gasto', data: g.data_gasto }));
      const rendasList = (Array.isArray(rendasRes) ? rendasRes : []).map(r => ({ ...r, tipo: 'receita', data: r.recebido_em }));
      setExtrato([...gastosList, ...rendasList].sort((a, b) => b.id - a.id));
      setPaginaExtrato(1);

      const promises = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(ano, mes - 1 - i, 1);
        promises.push(fetch(`${BASE_URL}/finance/resumo?ano=${d.getFullYear()}&mes=${d.getMonth()+1}`, { headers }).then(r => r.json()));
      }
      setHistorico(await Promise.all(promises));
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
      setRenderKey(k => k + 1);
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
      const res = await fetch(url, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setModalTipo(null);
      toast(tipo === 'gasto' ? 'Gasto registrado!' : 'Receita registrada!', 'success');
      loadDashboard();
    } catch (e) { toast(e.message, 'error'); }
  };

  const handleConfirmRenda = async (valor) => {
    try {
      const res = await fetch(`${BASE_URL}/finance/orcamento/${orcamentoId}`, {
        method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ renda_base: valor }),
      });
      if (!res.ok) throw new Error('Erro ao salvar renda.');
      setShowRendaModal(false);
      loadDashboard();
    } catch (e) { toast(e.message, 'error'); }
  };

  const renderPie = () => {
    if (!resumo) return <div className="fd-chart-empty">Sem dados este mês</div>;

    const saldo = Math.max(Number(resumo.saldo), 0);
    const fatias = [
      ...(saldo > 0 ? [{ nome: 'Disponível', cor: '#10b981', icone: '✓', total: saldo }] : []),
      ...(resumo.por_categoria || []),
    ];
    if (!fatias.length) return <div className="fd-chart-empty">Sem movimentação este mês</div>;

    const total = fatias.reduce((s, d) => s + d.total, 0);
    let angle = 0;
    const slices = fatias.map(d => {
      const pct = d.total / total;
      const start = angle;
      angle += pct * 360;
      return { ...d, pct, start, end: angle };
    });

    return (
      <div className="fd-pie-wrap">
        <div style={{ position: 'relative' }}>
          <svg viewBox="0 0 100 100" className="fd-pie-svg">
            {slices.map((s, i) => {
              const R = 42, r = 28;
              const p1o = toXY(s.start, R), p2o = toXY(s.end, R);
              const p1i = toXY(s.end, r),   p2i = toXY(s.start, r);
              const large = s.pct > 0.5 ? 1 : 0;
              const isHov = hovSlice === i;
              return (
                <path key={i}
                  d={`M${p1o.x},${p1o.y} A${R},${R} 0 ${large},1 ${p2o.x},${p2o.y} L${p1i.x},${p1i.y} A${r},${r} 0 ${large},0 ${p2i.x},${p2i.y} Z`}
                  fill={s.cor || '#A89BF2'}
                  stroke="rgba(5,5,5,0.6)"
                  strokeWidth="0.4"
                  opacity={hovSlice === null ? 0.9 : isHov ? 1 : 0.3}
                  style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                  onMouseEnter={() => setHovSlice(i)}
                  onMouseLeave={() => setHovSlice(null)}
                />
              );
            })}
            <text x="50" y="46" textAnchor="middle" fontSize="6.5" fill="rgba(168,155,242,0.45)" fontWeight="600">USADO</text>
            <text x="50" y="55" textAnchor="middle" fontSize="8" fill="var(--purple-light)" fontWeight="700">{resumo.percentual_gasto ?? 0}%</text>
          </svg>
          {hovSlice !== null && (
            <div className="fd-pie-tooltip">
              <span className="fd-pie-tooltip-dot" style={{ background: slices[hovSlice].cor || '#A89BF2' }}/>
              <span className="fd-pie-tooltip-nome">{slices[hovSlice].icone} {slices[hovSlice].nome}</span>
              <span className="fd-pie-tooltip-val">{fmt(slices[hovSlice].total)}</span>
              <span className="fd-pie-tooltip-pct">{Math.round(slices[hovSlice].pct * 100)}%</span>
            </div>
          )}
        </div>
        <div className="fd-pie-legend">
          {slices.map((s, i) => (
            <div key={i}
              className={`fd-legend-item${hovSlice === i ? ' fd-legend-item-hov' : ''}`}
              onMouseEnter={() => setHovSlice(i)}
              onMouseLeave={() => setHovSlice(null)}
            >
              <span className="fd-legend-dot" style={{ background: s.cor || '#A89BF2' }}/>
              <span className="fd-legend-name">{s.icone} {s.nome}</span>
              <span className="fd-legend-val">{fmt(s.total)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderBar = () => {
    if (!historico?.length) return null;
    const max = Math.max(...historico.map(d => d.total_gastos || 0), 1);
    return (
      <div style={{ position: 'relative' }}>
        <svg viewBox="0 0 300 120" className="fd-bar-svg">
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--purple-primary)" stopOpacity="0.9"/>
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.5"/>
            </linearGradient>
          </defs>
          {[0,1,2,3].map(i => (
            <line key={i} x1="30" y1={10+i*25} x2="295" y2={10+i*25} stroke="rgba(168,155,242,0.06)" strokeWidth="1"/>
          ))}
          {historico.map((d, i) => {
            const barH = Math.max(((d.total_gastos || 0) / max) * 80, 2);
            const x = 38 + i * 44;
            const y = 95 - barH;
            const isAtual = i === historico.length - 1;
            const isHov = hovBar === i;
            return (
              <g key={i} onMouseEnter={() => setHovBar(i)} onMouseLeave={() => setHovBar(null)} style={{ cursor: 'pointer' }}>
                <rect x={x} y={y} width="28" height={barH} rx="4"
                  fill={isAtual ? 'url(#barGrad)' : 'rgba(168,155,242,0.2)'}
                  opacity={hovBar === null ? 1 : isHov ? 1 : 0.35}
                  style={{ transition: 'opacity 0.2s' }}
                />
                <text x={x+14} y="112" textAnchor="middle" fontSize="8"
                  fill={isAtual || isHov ? 'var(--purple-light)' : 'rgba(168,155,242,0.4)'}
                  fontWeight={isAtual || isHov ? '700' : '400'}>
                  {MESES[(d.mes || 1) - 1]}
                </text>
                {(d.total_gastos || 0) > 0 && (
                  <text x={x+14} y={y-4} textAnchor="middle" fontSize="6.5" fill="rgba(168,155,242,0.6)">
                    {fmt(d.total_gastos).replace('R$\u00a0','')}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {hovBar !== null && (historico[hovBar].total_gastos || 0) > 0 && (
          <div className="fd-bar-tooltip">
            <span className="fd-bar-tooltip-mes">{MESES[(historico[hovBar].mes || 1) - 1]} {historico[hovBar].ano}</span>
            <span className="fd-bar-tooltip-val">{fmt(historico[hovBar].total_gastos)}</span>
          </div>
        )}
      </div>
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
          <div className="fd-subtitle">{MESES[mes-1]} {ano} · Olá, {usuario?.nome?.split(' ')[0]} 👋</div>
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
          { label: 'Renda Total', value: resumo?.renda_total,  icon: <Wallet size={18}/>,      color: 'purple' },
          { label: 'Total Gasto', value: resumo?.total_gastos, icon: <TrendingDown size={18}/>, color: 'red'    },
          { label: 'Disponível',  value: resumo?.saldo,        icon: <TrendingUp size={18}/>,   color: 'green'  },
        ].map(c => (
          <div key={c.label} className={`fd-card fd-card-${c.color}`}>
            <div className="fd-card-top">
              <div className="fd-card-icon">{c.icon}</div>
              <div className="fd-card-value">{loading ? '—' : fmt(c.value)}</div>
            </div>
            <div className="fd-card-label">{c.label}</div>
            {c.color === 'green' && resumo && <div className="fd-card-sub">{resumo.percentual_gasto}% da renda utilizado</div>}
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="fd-charts">
        <div className="fd-chart-card">
          <div className="fd-chart-header"><span className="fd-chart-title">Visão geral do mês</span></div>
          <div className="fd-chart-body">
            {loading ? <div className="fd-loading"><div className="dash-spinner"/></div> : renderPie()}
          </div>
        </div>
        <div className="fd-chart-card">
          <div className="fd-chart-header"><span className="fd-chart-title">Gastos dos últimos 6 meses</span></div>
          <div className="fd-chart-body">
            {loading ? <div className="fd-loading"><div className="dash-spinner"/></div> : renderBar()}
          </div>
        </div>
      </div>

      {/* Extrato */}
      <div className="fd-table-card">
        <div className="fd-chart-header">
          <span className="fd-chart-title">Movimentação geral</span>
          <div className="fd-extrato-header-right">
            <span className="fd-badge">{extrato.length} lançamentos</span>
            {Math.ceil(extrato.length / POR_PAGINA) > 1 && (
              <div className="gs-pag">
                <button className="gs-pag-btn" onClick={() => setPaginaExtrato(p => p-1)} disabled={paginaExtrato === 1}>‹</button>
                <span className="gs-pag-info">{paginaExtrato} / {Math.ceil(extrato.length / POR_PAGINA)}</span>
                <button className="gs-pag-btn" onClick={() => setPaginaExtrato(p => p+1)} disabled={paginaExtrato === Math.ceil(extrato.length / POR_PAGINA)}>›</button>
              </div>
            )}
          </div>
        </div>
        <div className="fd-extrato-head">
          <span>Data</span><span>Descrição</span><span>Categoria</span><span>Tipo</span>
          <span style={{textAlign:'right'}}>Valor</span>
        </div>
        <div key={`fd-body-${renderKey}`} className="fd-extrato-body">
          {loading ? (
            <div className="fd-loading"><div className="dash-spinner"/></div>
          ) : extrato.length === 0 ? (
            <div className="fd-empty">Nenhuma movimentação registrada este mês.</div>
          ) : extrato.slice((paginaExtrato-1)*POR_PAGINA, paginaExtrato*POR_PAGINA).map((item, i) => {
            const isReceita = item.tipo === 'receita';
            const cat = item.categorias;
            return (
              <div key={item.id} className={`fd-extrato-row${i%2===0?' fd-extrato-row-alt':''}`}>
                <span className="fd-ext-date">{new Date(item.data+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}</span>
                <span className="fd-ext-desc">{item.descricao}</span>
                <span className="fd-ext-cat">
                  {cat
                    ? <span className="fd-ext-cat-badge" style={{background:(cat.cor||'#888')+'22',border:`1px solid ${cat.cor||'#888'}44`,color:cat.cor||'#888'}}>{cat.icone} {cat.nome}</span>
                    : <span className="fd-ext-cat-none">—</span>}
                </span>
                <span><span className={`fd-ext-tipo ${isReceita?'fd-tipo-receita':'fd-tipo-gasto'}`}>{isReceita?'↑ Receita':'↓ Gasto'}</span></span>
                <span className={`fd-ext-val ${isReceita?'fd-val-pos':'fd-val-neg'}`}>{isReceita?'+':'-'} {fmt(item.valor)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* FAB */}
      <div className="fd-fab-wrap" ref={fabRef}>
        <div className={`fd-fab-menu${fabOpen?' open':''}`}>
          <button className="fd-fab-option fd-fab-meta"    onClick={() => { navigate('/app/metas'); setFabOpen(false); }}><PiggyBank size={15}/> Meta</button>
          <button className="fd-fab-option fd-fab-receita" onClick={() => { setModalTipo('receita'); setFabOpen(false); }}><TrendingUp size={15}/> Receita</button>
          <button className="fd-fab-option fd-fab-gasto"   onClick={() => { setModalTipo('gasto'); setFabOpen(false); }}><TrendingDown size={15}/> Gasto</button>
        </div>
        <button className={`fd-fab${fabOpen?' fd-fab-active':''}`} onClick={() => setFabOpen(o => !o)}>
          {fabOpen ? <X size={20}/> : <Plus size={20}/>}
        </button>
      </div>
    </div>
  );
}
