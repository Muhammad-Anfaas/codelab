import Icon from './Icon';
import './StatCard.css';

/**
 * A single headline number.
 *
 * Props
 *  - label: "Total students"
 *  - value: 214
 *  - icon:  optional Icon name
 *  - hint:  optional small text under the value, e.g. "+12 this month"
 */
export default function StatCard({ label, value, icon, hint }) {
  return (
    <div className="stat-card">
      {icon && (
        <div className="stat-icon">
          <Icon name={icon} size={22} />
        </div>
      )}
      <div className="stat-body">
        <div className="stat-label">{label}</div>
        <div className="stat-value mono">{value}</div>
        {hint && <div className="stat-hint">{hint}</div>}
      </div>
    </div>
  );
}
