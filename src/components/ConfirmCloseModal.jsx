import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

export function useConfirmClose(temConteudo, onClose) {
  const [exiting, setExiting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const tentar = () => {
    if (temConteudo()) setShowConfirm(true);
    else sair();
  };

  const sair = () => {
    setShowConfirm(false);
    setExiting(true);
    setTimeout(() => { setExiting(false); onClose(); }, 280);
  };

  return { exiting, showConfirm, setShowConfirm, tentar, sair };
}

export default function ConfirmCloseModal({ onConfirm, onCancel }) {
  return createPortal(
    <div className="usr-modal-overlay" style={{ zIndex: 99999 }} onClick={onCancel}>
      <div className="usr-modal-box" onClick={e => e.stopPropagation()}>
        <div className="usr-modal-icon usr-modal-icon-red">
          <AlertTriangle size={22}/>
        </div>
        <div className="usr-modal-title">Sair sem salvar?</div>
        <div className="usr-modal-desc">
          Você tem alterações não salvas. Se sair agora, elas serão perdidas.
        </div>
        <div className="usr-modal-actions">
          <button className="usr-btn-cancel" onClick={onCancel}>Continuar editando</button>
          <button className="usr-btn-delete" onClick={onConfirm}>Sair sem salvar</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
