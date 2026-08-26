import { Link } from 'react-router-dom';
import './Breadcrumb.css';

/**
 * Breadcrumb navigation.
 * 
 * @param {Array} items - Array of { label: string, to?: string }
 *   The last item is treated as the current page and rendered without a link.
 */
export default function Breadcrumb({ items = [] }) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        
        return (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && <span className="breadcrumb__separator">|</span>}
            {isLast || !item.to ? (
              <span className={isLast ? 'breadcrumb__current' : ''}>{item.label}</span>
            ) : (
              <Link to={item.to} className="breadcrumb__link">{item.label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
