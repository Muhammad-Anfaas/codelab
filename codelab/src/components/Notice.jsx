import Icon from './Icon';
import './Notice.css';

/**
 * A dismissible message shown at the top of a page after an action
 * ("Invitation sent to …"). `tone` is "info" (default) or "error".
 */
export default function Notice({ tone = 'info', children, onDismiss }) {
  return (
    <div className={`notice notice-${tone}`} role="status">
      <div className="notice-text">{children}</div>
      {onDismiss && (
        <button type="button" className="notice-close" onClick={onDismiss} aria-label="Dismiss">
          <Icon name="close" size={16} />
        </button>
      )}
    </div>
  );
}
