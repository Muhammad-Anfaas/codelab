import { useEffect, useRef } from 'react';
import Icon from './Icon';
import './Modal.css';

/**
 * A dialog box. Closes on the X button, the Escape key, or a click on the
 * dark backdrop. The parent controls whether it is shown:
 *
 *   {open && <Modal title="Add teacher" onClose={() => setOpen(false)}>…</Modal>}
 */
export default function Modal({ title, onClose, children, wide = false }) {
  const bodyRef = useRef(null);

  // On open: focus the first field and stop the page behind from scrolling.
  useEffect(() => {
    const first = bodyRef.current?.querySelector('input, select, textarea, button');
    first?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`modal${wide ? ' modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="modal-body" ref={bodyRef}>
          {children}
        </div>
      </div>
    </div>
  );
}
