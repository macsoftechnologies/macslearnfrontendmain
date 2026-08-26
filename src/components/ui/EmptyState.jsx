import './EmptyState.css';

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="empty-state">
      {Icon && (
        <div className="empty-state__icon">
          <Icon size={26} strokeWidth={1.5} />
        </div>
      )}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
