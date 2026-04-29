import { useState } from 'react';
import { DollarSign } from 'lucide-react';
import '../components/Modal.css';

export default function RendaModal({ onConfirm }) {
  const [renda, setRenda] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const handleSubmit = async () => {
    const valor = parseFloat(renda.replace(',', '.'));
    if (!valor || valor <= 0) return setErro('Informe uma renda válida.');
    setLoading(true);
    await onConfirm(valor);
    setLoading(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-icon" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
          <DollarSign size={22} color="#050505"/>
        </div>
        <div className="modal-title">Qual é sua renda mensal?</div>
        <p style={{ fontSize: 13, color: 'rgba(168,155,242,0.5)', marginBottom: 24, lineHeight: 1.6 }}>
          Para começar a controlar suas finanças, informe sua renda mensal. Você pode alterar isso a qualquer momento.
        </p>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(168,155,242,0.6)', fontWeight: 600, marginBottom: 8 }}>
            Renda mensal (R$)
          </label>
          <input
            type="number"
            placeholder="0,00"
            value={renda}
            onChange={e => { setRenda(e.target.value); setErro(''); }}
            style={{
              width: '100%', padding: '12px 14px', background: 'rgba(168,155,242,0.05)',
              border: `1px solid ${erro ? 'rgba(255,80,80,0.5)' : 'rgba(168,155,242,0.2)'}`,
              borderRadius: 8, color: '#fff', fontSize: 16, outline: 'none',
              fontFamily: 'inherit', boxSizing: 'border-box',
            }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
          {erro && <span style={{ fontSize: 11, color: '#ff6b6b', marginTop: 6, display: 'block' }}>⚠ {erro}</span>}
        </div>
        <button className="modal-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Salvando...' : 'Começar a controlar'}
        </button>
      </div>
    </div>
  );
}
