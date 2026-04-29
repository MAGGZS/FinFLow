import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, RefreshCw, Plus, Trash2 } from 'lucide-react';
import Toast, { useToast } from '../components/Toast';
import Select from '../components/Select';
import LancamentoModal from './LancamentoModal';
import './Receitas.css';
import '../components/Usuarios.css';
import './FinanceDashboard.css';

const BASE_URL = import.meta.env.VITE_API_URL;
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export default function Receitas() {
  const navigate = useNavigate();
  const { toasts, show: toast } = useToast();
  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');

  const now = new Date();
  const [ano, setAno]               = useState(now.getFullYear());
  const [mes, setMes]               = useState(now.getMonth() + 1);
  const [receitas, setReceitas]     = useState([]);
  const [resumo, setResumo]         = useState(null);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [orcamentoId, setOrcamentoId] = useState(null);
  const [renderKey, setRenderKey]   = useState(0);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [pagina, setPagina]         = useState(1);
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

      const [receitasRes, catsRes] = await Promise.all([
        fetch(`${BASE_URL}/finance/orcamento/${data.orcamento.id}/rendas`, { headers }).then(r => r.json()),
        fetch(`${BASE_URL}/finance/categorias`, { headers }).then(r => r.json()),
      ]);
      setReceitas(Array.isArray(receitasRes) ? receitasRes.sort((a, b) => b.id - a.id) : []);
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
      const res = await fetch(`${BASE_URL}/finance/orcamento/${orcamentoId}/rendas`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descricao: form.descricao,
          valor: form.valor,
          recebido_em: form.data,
          categoria_id: form.categoria_id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowModal(false);
      toast('Receita registrada!', 'success');
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
      const res = await fetch(`${BASE_URL}/finance/rendas/${confirmDelete.id}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error('Erro ao excluir receita.');
      toast('Receita excluída!', 'success');
      load();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // Agrupa receitas por categoria para o card de resumo
  const catsPorCategoria = (() => {
    const map = {};
    receitas.forEach(r => {
      const cat = r.categorias;
      const key = cat ? cat.id : '__sem__';
      if (!map[key]) map[key] = { ...cat, nome: cat?.nome || 'Sem categoria', cor: cat?.cor || '#A89BF2', icone: cat?.icone || '💰', total: 0 };
      map[key].total += Number(r.valor);
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  })();

  const totalReceita = resumo?.renda_total || 0;
  const totalPaginas = Math.ceil(receitas.length / POR_PAGINA);
  const receitasPagina = receitas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  return (
    <div className="rc-page">
      <Toast toasts={toasts} />

      {confirmDelete && (
        <div className="usr-modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="usr-modal-box" onClick={e => e.stopPropagation()}>
            <div className="usr-modal-icon" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' }}>
              <Trash2 size={22}/>
            </div>
            <div className="usr-modal-title">Excluir receita?</div>
            <div className="usr-modal-desc">
              Tem certeza que deseja excluir <strong>{confirmDelete.descricao}</strong>?<br/>
              Essa ação não pode ser desfeita.
            </div>
            <div className="usr-modal-actions">
              <button className="usr-btn-cancel" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="usr-btn-delete" style={{ borderColor: 'rgba(16,185,129,0.3)', color: '#10b981', background: 'rgba(16,185,129,0.08)' }} onClick={handleDeletar}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <LancamentoModal
          tipo="receita"
          categorias={categorias}
          onSave={handleSalvar}
          onCancel={() => setShowModal(false)}
        />
      )}

      {/* Topbar */}
      <div className="rc-topbar">
        <div>
          <div className="rc-title">Receitas</div>
          <div className="rc-subtitle">{MESES[mes - 1]} {ano} · {receitas.length} lançamentos</div>
        </div>
        <div className="rc-topbar-right">
          <Select
            value={mes}
            onChange={v => setMes(+v)}
            options={MESES.map((m, i) => ({ value: i + 1, label: m }))}
          />
          <Select
            value={ano}
            onChange={v => setAno(+v)}
            options={[2024, 2025, 2026].map(y => ({ value: y, label: String(y) }))}
          />
          <button className="rc-refresh" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
          <button className="rc-add-btn" onClick={() => setShowModal(true)}>
            <Plus size={14} /> Adicionar receita
          </button>
        </div>
      </div>

      {/* Card resumo */}
      <div className="rc-resumo-card">
        <div className="rc-resumo-top">
          <div>
            <div className="rc-resumo-label">Total recebido no mês</div>
            <div className="rc-resumo-value">{loading ? '—' : fmt(totalReceita)}</div>
            {!loading && resumo?.total_gastos > 0 && (
              <div className="rc-resumo-sub">{resumo.percentual_gasto}% da renda utilizado em gastos</div>
            )}
          </div>
          <div className="rc-resumo-icon"><TrendingUp size={20} /></div>
        </div>

        {!loading && catsPorCategoria.length > 0 && (
          <>
            <div className="rc-bar-wrap">
              {catsPorCategoria.map((c, i) => (
                <div key={i} className="rc-bar-seg"
                  style={{ width: `${(c.total / totalReceita) * 100}%`, background: c.cor || '#10b981' }}
                  title={`${c.icone} ${c.nome}: ${fmt(c.total)}`}
                />
              ))}
            </div>
            <div className="rc-cats-list">
              {catsPorCategoria.map((c, i) => (
                <div key={i} className="rc-cat-row">
                  <span className="rc-cat-dot" style={{ background: c.cor || '#10b981' }} />
                  <div className="rc-cat-info">
                    <div className="rc-cat-nome">{c.icone} {c.nome}</div>
                    <div className="rc-cat-mini-bar-wrap">
                      <div className="rc-cat-mini-bar" style={{ width: `${(c.total / totalReceita) * 100}%`, background: c.cor || '#10b981' }} />
                    </div>
                  </div>
                  <span className="rc-cat-val">{fmt(c.total)}</span>
                  <span className="rc-cat-pct">{Math.round((c.total / totalReceita) * 100)}%</span>
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && catsPorCategoria.length === 0 && (
          <div className="rc-empty-cats">Nenhuma receita registrada este mês.</div>
        )}

        {loading && <div className="rc-loading"><div className="dash-spinner" /></div>}
      </div>

      {/* Extrato */}
      <div className="rc-table-card">
        <div className="rc-table-header">
          <span className="rc-table-title">Extrato de receitas</span>
          <div className="rc-table-header-right">
            <span className="rc-badge">{receitas.length} lançamentos</span>
            {totalPaginas > 1 && (
              <div className="gs-pag">
                <button className="gs-pag-btn" onClick={() => setPagina(p => p - 1)} disabled={pagina === 1}>‹</button>
                <span className="gs-pag-info">{pagina} / {totalPaginas}</span>
                <button className="gs-pag-btn" onClick={() => setPagina(p => p + 1)} disabled={pagina === totalPaginas}>›</button>
              </div>
            )}
          </div>
        </div>

        <div className="rc-extrato-head">
          <span>Data</span>
          <span>Descrição</span>
          <span>Categoria</span>
          <span style={{ textAlign: 'right' }}>Valor</span>
          <span/>
        </div>

        <div key={`rc-body-${renderKey}`} className="rc-extrato-body">
          {loading ? (
            <div className="rc-loading"><div className="dash-spinner" /></div>
          ) : receitas.length === 0 ? (
            <div className="rc-empty">Nenhuma receita registrada este mês.</div>
          ) : receitasPagina.map((r, i) => {
            const cat = r.categorias;
            return (
              <div key={r.id} className={`rc-extrato-row${i % 2 === 0 ? ' rc-row-alt' : ''}`}>
                <span className="rc-ext-date">
                  {new Date(r.recebido_em + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </span>
                <span className="rc-ext-desc">{r.descricao}</span>
                <span className="rc-ext-cat">
                  {cat ? (
                    <span className="rc-cat-badge" style={{ background: (cat.cor || '#888') + '22', border: `1px solid ${cat.cor || '#888'}44`, color: cat.cor || '#888' }}>
                      {cat.icone} {cat.nome}
                    </span>
                  ) : <span className="rc-cat-none">—</span>}
                </span>
                <span className="rc-ext-val">+ {fmt(r.valor)}</span>
                <span className="rc-ext-actions">
                  <button
                    className="rc-del-btn"
                    onClick={() => setConfirmDelete(r)}
                    disabled={deletingId === r.id}
                    title="Excluir receita"
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
