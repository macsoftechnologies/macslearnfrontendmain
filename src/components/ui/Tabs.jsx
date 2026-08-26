import './Tabs.css';

export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <button
          key={t.key}
          className={`tabs__item ${active === t.key ? 'tabs__item--active' : ''}`}
          onClick={() => onChange(t.key)}
        >
          {t.icon && <t.icon size={15} />}
          {t.label}
          {t.count != null && <span className="tabs__count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
