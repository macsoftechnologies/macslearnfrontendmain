import './Card.css';

export function Card({ children, className = '', ...rest }) {
  return (
    <div className={`card ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, tone = 'ink', trend }) {
  return (
    <div className={`stat-card stat-card--${tone}`}>
      <div className="stat-card__top">
        <span className="stat-card__label">{label}</span>
        {Icon && (
          <span className="stat-card__icon">
            <Icon size={17} />
          </span>
        )}
      </div>
      <div className="stat-card__value">{value}</div>
      {trend && <div className="stat-card__trend">{trend}</div>}
    </div>
  );
}
