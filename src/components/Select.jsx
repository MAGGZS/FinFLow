import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import './Select.css';

export default function Select({ value, onChange, options, placeholder = 'Selecione...' }) {
  const [open, setOpen]       = useState(false);
  const [animate, setAnimate] = useState(false);
  const [rect, setRect]       = useState(null);
  const triggerRef            = useRef(null);
  const dropdownRef           = useRef(null);

  const selected = options.find(o => String(o.value) === String(value));

  const getRect = useCallback(() => {
    if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
  }, []);

  const handleOpen = () => {
    getRect();
    setOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)));
  };

  const handleClose = useCallback(() => {
    setAnimate(false);
    setTimeout(() => setOpen(false), 180);
  }, []);

  const handleToggle = () => (open ? handleClose() : handleOpen());

  const handleSelect = (val) => {
    onChange(val);
    handleClose();
  };

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (
        !triggerRef.current?.contains(e.target) &&
        !dropdownRef.current?.contains(e.target)
      ) handleClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, handleClose]);

  // Reposiciona ao rolar ou redimensionar
  useEffect(() => {
    if (!open) return;
    window.addEventListener('scroll', getRect, true);
    window.addEventListener('resize', getRect);
    return () => {
      window.removeEventListener('scroll', getRect, true);
      window.removeEventListener('resize', getRect);
    };
  }, [open, getRect]);

  const dropdown = open && rect && createPortal(
    <div
      ref={dropdownRef}
      className={`csel-dropdown${animate ? ' csel-dropdown--open' : ''}`}
      style={{ top: rect.bottom + 6, left: rect.left, width: rect.width }}
    >
      {options.map(o => {
        const active = String(o.value) === String(value);
        return (
          <div
            key={o.value}
            className={`csel-item${active ? ' csel-item--active' : ''}`}
            onMouseDown={e => { e.preventDefault(); handleSelect(o.value); }}
          >
            {active && <span className="csel-check">✓</span>}
            {o.label}
          </div>
        );
      })}
    </div>,
    document.body
  );

  return (
    <div className={`csel${open ? ' csel--open' : ''}`}>
      <button
        type="button"
        ref={triggerRef}
        className="csel-trigger"
        onClick={handleToggle}
      >
        <span className={selected ? 'csel-value' : 'csel-placeholder'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={14} className="csel-arrow" />
      </button>
      {dropdown}
    </div>
  );
}
