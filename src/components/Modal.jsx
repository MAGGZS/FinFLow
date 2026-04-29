import { useNavigate } from 'react-router-dom';
import './Modal.css';

export default function Modal({ usuario, onClose }) {
  const navigate = useNavigate();
  if (!usuario) return null;

  const handleContinue = () => {
    if (usuario.admin) {
      localStorage.setItem('usuario', JSON.stringify(usuario));
      navigate('/admin');
    } else {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-icon">✓</div>
        <div className="modal-title">Login realizado!</div>
        <div className="modal-body">
          <div className="modal-row">
            <span className="modal-label">Nome</span>
            <span className="modal-value">{usuario.nome}</span>
          </div>
          <div className="modal-row">
            <span className="modal-label">Email</span>
            <span className="modal-value">{usuario.email}</span>
          </div>
          <div className="modal-row">
            <span className="modal-label">Perfil</span>
            <span className="modal-value">{usuario.admin ? '⚙ Administrador' : '👤 Usuário'}</span>
          </div>
        </div>
        <button className="modal-btn" onClick={handleContinue}>
          {usuario.admin ? 'Ir para o painel' : 'Continuar'}
        </button>
      </div>
    </div>
  );
}
