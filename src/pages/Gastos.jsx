import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingDown, RefreshCw, Plus, Trash2 } from 'lucide-react';
import Toast, { useToast } from '../components/Toast';
import LancamentoModal from './LancamentoModal';
import './Gastos.css';
import '../components/Usuarios.css';
import './FinanceDashboard.css';

const BASE_URL = import.meta.env.VITE_API_URL;
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export default function Gastos() {
  const navigate = useNavigate();
  const { toasts, show: toast } = useToast();
  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');

  const now = new Date();
  const [ano, setAno] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [gastos, setGastos] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [orcamentoId, setOrcamentoId] = useState(null);
  const [renderKey, setRenderKey] = useState(0);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 10;

  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  useEffect(() => {
    if (!usuario) { navigate('/'); return; }
    load();
  }, [ano, mes]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/finance/resumo?ano=${ano}&mes=${mes}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResumo(data);
      setOrcamentoId(data.orcamento.id);

      const [gastosRes, catsRes] = await Promise.all([
        fetch(`${BASE_URL}/finance/orcamento/${data.orcamento.id}/gastos`, { headers }).then(r => r.json()),
        fetch(`${BASE_URL}/finance/categorias`, { headers }).then(r => r.json()),
      ]);
      setGastos(Array.isArray(gastosRes) ? gastosRes.sort((a, b) => b.id - a.id) : []);
      setCategorias(Array.isArray(catsRes) ? catsRes : []);
      setPagina(1);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
      setRenderKey(k => k + 1);
    }
  };

  const handleSalvar = async (form) => {
    try {
      const res = await fetch(`${BASE_URL}/finance/orcamento/${orcamentoId}/gastos`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descricao: form.descricao,
          valor: form.valor,
          data_gasto: form.data,
          categoria_id: form.categoria_id || null,
          recorrente: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowModal(false);
      toast('Gasto registrado!', 'success');
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const handleDeletar = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    setConfirmDelete(null);
    try {
      const res = await fetch(`${BASE_URL}/finance/gastos/${confirmDelete.id}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error('Erro ao excluir gasto.');
      toast('Gasto excluído!', 'success');
      load();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const catsPorCategoria = resumo?.por_categoria || [];
  const totalGasto = resumo?.total_gastos || 0;
  const totalRenda = resumo?.renda_total || 0;
  const pctUsado = totalRenda > 0 ? Math.round((totalGasto / totalRenda) * 100) : 0;
  const totalPaginas = Math.ceil(gastos.length / POR_PAGINA);
  const gastosPagina = gastos.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  return (
    <div className="gs-page">
      <Toast toasts={toasts} />

      {confirmDelete && (
        <div className="usr-modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="usr-modal-box" onClick={e => e.stopPropagation()}>
            <div className="usr-modal-icon usr-modal-icon-red"><Trash2 size={22}/></div>
            <div className="usr-modal-title">Excluir gasto?</div>
            <div className="usr-modal-desc">
              Tem certeza que deseja excluir <strong>{confirmDelete.descricao}</strong>?<br/>
              Essa ação não pode ser desfeita.
            </div>
            <div className="usr-modal-actions">
              <button className="usr-btn-cancel" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="usr-btn-delete" onClick={handleDeletar}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <LancamentoModal
          tipo="gasto"
          categorias={categorias}
          onSave={handleSalvar}
          onCancel={() => setShowModal(false)}
        />
      )}

      {/* Topbar */}
      <div className="gs-topbar">
        <div>
          <div className="gs-title">Gastos</div>
          <div className="gs-subtitle">{MESES[mes - 1]} {ano} · {gastos.length} lançamentos</div>
        </div>
        <div className="gs-topbar-right">
          <select className="gs-select" value={mes} onChange={e => setMes(+e.target.value)}>
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="gs-select" value={ano} onChange={e => setAno(+e.target.value)}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="gs-refresh" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
          <button className="gs-add-btn" onClick={() => setShowModal(true)}>
            <Plus size={14} /> Adicionar gasto
          </button>
        </div>
      </div>

      {/* Card resumo */}
      <div className="gs-resumo-card">
        <div className="gs-resumo-top">
          <div>
            <div className="gs-resumo-label">Total gasto no mês</div>
            <div className="gs-resumo-value">{loading ? '—' : fmt(totalGasto)}</div>
            {!loading && totalRenda > 0 && (
              <div className="gs-resumo-sub">{pctUsado}% da renda mensal utilizado</div>
            )}
          </div>
          <div className="gs-resumo-icon"><TrendingDown size={20} /></div>
        </div>

        {!loading && catsPorCategoria.length > 0 && (
          <>
            <div className="gs-bar-wrap">
              {catsPorCategoria.map((c, i) => (
                <div
                  key={i}
                  className="gs-bar-seg"
                  style={{ width: `${(c.total / totalGasto) * 100}%`, background: c.cor || '#A89BF2' }}
                  title={`${c.icone} ${c.nome}: ${fmt(c.total)}`}
                />
              ))}
            </div>
            <div className="gs-cats-list">
              {catsPorCategoria.map((c, i) => (
                <div key={i} className="gs-cat-row">
                  <span className="gs-cat-dot" style={{ background: c.cor || '#A89BF2' }} />
                  <div className="gs-cat-info">
                    <div className="gs-cat-nome">{c.icone} {c.nome}</div>
                    <div className="gs-cat-mini-bar-wrap">
                      <div className="gs-cat-mini-bar" style={{ width: `${(c.total / totalGasto) * 100}%`, background: c.cor || '#A89BF2' }} />
                    </div>
                  </div>
                  <span className="gs-cat-val">{fmt(c.total)}</span>
                  <span className="gs-cat-pct">{Math.round((c.total / totalGasto) * 100)}%</span>
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && catsPorCategoria.length === 0 && (
          <div className="gs-empty-cats">Nenhum gasto categorizado este mês.</div>
        )}

        {loading && <div className="gs-loading"><div className="dash-spinner" /></div>}
      </div>

      {/* Extrato */}
      <div className="gs-table-card">
        <div className="gs-table-header">
          <span className="gs-table-title">Extrato de gastos</span>
          <div className="gs-table-header-right">
            <span className="gs-badge">{gastos.length} lançamentos</span>
            {totalPaginas > 1 && (
              <div className="gs-pag">
                <button className="gs-pag-btn" onClick={() => setPagina(p => p - 1)} disabled={pagina === 1}>‹</button>
                <span className="gs-pag-info">{pagina} / {totalPaginas}</span>
                <button className="gs-pag-btn" onClick={() => setPagina(p => p + 1)} disabled={pagina === totalPaginas}>›</button>
              </div>
            )}
          </div>
        </div>

        <div className="gs-extrato-head">
          <span>Data</span>
          <span>Descrição</span>
          <span>Categoria</span>
          <span style={{ textAlign: 'right' }}>Valor</span>
          <span/>
        </div>

        <div key={`gs-body-${renderKey}`} className="gs-extrato-body">
          {loading ? (
            <div className="gs-loading"><div className="dash-spinner" /></div>
          ) : gastos.length === 0 ? (
            <div className="gs-empty">Nenhum gasto registrado este mês.</div>
          ) : gastosPagina.map((g, i) => {
            const cat = g.categorias;
            return (
              <div key={g.id} className={`gs-extrato-row${i % 2 === 0 ? ' gs-row-alt' : ''}`}>
                <span className="gs-ext-date">
                  {new Date(g.data_gasto + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </span>
                <span className="gs-ext-desc">{g.descricao}</span>
                <span className="gs-ext-cat">
                  {cat ? (
                    <span className="gs-cat-badge" style={{ background: (cat.cor || '#888') + '22', border: `1px solid ${cat.cor || '#888'}44`, color: cat.cor || '#888' }}>
                      {cat.icone} {cat.nome}
                    </span>
                  ) : <span className="gs-cat-none">—</span>}
                </span>
                <span className="gs-ext-val">- {fmt(g.valor)}</span>
                <span className="gs-ext-actions">
                  <button
                    className="gs-del-btn"
                    onClick={() => setConfirmDelete(g)}
                    disabled={deletingId === g.id}
                    title="Excluir gasto"
                  >
                    <Trash2 size={13} />
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
