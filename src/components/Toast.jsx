import { useState, useEffect } from 'react';
import './Toast.css';

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const show = (message, type = 'error') => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };

  return { toasts, show };
}

export default function Toast({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">{t.type === 'error' ? '✕' : '✓'}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}
