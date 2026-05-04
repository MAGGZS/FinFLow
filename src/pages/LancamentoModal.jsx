import { useState } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import Select from '../components/Select';
import ConfirmCloseModal, { useConfirmClose } from '../components/ConfirmCloseModal';

export default function LancamentoModal({ tipo, categorias, onSave, onCancel }) {
  const hoje = new Date().toISOString().slice(0, 10);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(hoje);
  const [categoriaId, setCategoriaId] = useState('');
  const [catPersonalizada, setCatPersonalizada] = useState('');
  const [saving, setSaving] = useState(false);

  const isGasto = tipo === 'gasto';
  const catsFiltradas = categorias.filter(c => c.tipo === (isGasto ? 'gasto' : 'receita'));
  const isOutra = categoriaId === 'outra';

  const temConteudo = () => !!descricao.trim() || !!valor;
  const { exiting, showConfirm, setShowConfirm, tentar, sair } = useConfirmClose(temConteudo, onCancel);

  const handleSubmit = async () => {
    if (!descricao.trim()) return;
    const v = parseFloat(valor.replace(',', '.'));
    if (!v || v <= 0) return;
    const catId = isOutra ? null : (categoriaId || null);
    const descFinal = isOutra && catPersonalizada ? `[${catPersonalizada}] ${descricao}` : descricao;
    setSaving(true);
    await onSave({ descricao: descFinal, valor: v, data, categoria_id: catId });
    setSaving(false);
  };

  const accentColor  = isGasto ? '#ef4444' : '#10b981';
  const accentBg     = isGasto ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)';
  const accentBorder = isGasto ? 'rgba(239,68,68,0.2)'  : 'rgba(16,185,129,0.2)';

  return (
    <>
      {showConfirm && <ConfirmCloseModal onConfirm={sair} onCancel={() => setShowConfirm(false)}/>}
      <div className={`usr-modal-overlay${exiting ? ' exiting' : ''}`} onClick={tentar}>
        <div className="usr-modal-box usr-modal-edit" onClick={e => e.stopPropagation()}>

          <div className="fd-lm-header" style={{ borderColor: 'rgba(168,155,242,0.08)' }}>
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
            <input
              placeholder={isGasto ? 'Ex: Almoço, Uber...' : 'Ex: Salário, Freelance...'}
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              autoFocus
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="usr-edit-field">
              <label>Valor (R$)</label>
              <input
                type="number"
                placeholder="0,00"
                value={valor}
                onChange={e => setValor(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>
            <div className="usr-edit-field">
              <label>Data</label>
              <input
                type="date"
                value={data}
                onChange={e => setData(e.target.value)}
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>

          <div className="usr-edit-field">
            <label>Categoria</label>
            <Select
              value={categoriaId}
              onChange={v => setCategoriaId(v)}
              placeholder="Sem categoria"
              options={[
                { value: '', label: 'Sem categoria' },
                ...catsFiltradas.map(c => ({ value: String(c.id), label: `${c.icone} ${c.nome}` })),
                { value: 'outra', label: '➕ Outra categoria...' },
              ]}
            />
          </div>

          {isOutra && (
            <div className="usr-edit-field">
              <label>Nome da categoria personalizada</label>
              <input
                placeholder="Ex: Academia, Pet..."
                value={catPersonalizada}
                onChange={e => setCatPersonalizada(e.target.value)}
                autoFocus
              />
            </div>
          )}

          <div className="usr-modal-actions">
            <button className="usr-btn-cancel" onClick={tentar} disabled={saving}>Cancelar</button>
            <button
              className="usr-btn-save"
              onClick={handleSubmit}
              disabled={saving || !descricao || !valor}
              style={{ background: `linear-gradient(135deg, ${accentColor}, ${isGasto ? '#dc2626' : '#059669'})` }}
            >
              {saving ? 'Salvando...' : isGasto ? 'Registrar gasto' : 'Registrar receita'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
