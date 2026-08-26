import { Search, X } from 'lucide-react';
import './SearchBar.css';

export default function SearchBar({ value, onChange, placeholder = 'Search…', className = '' }) {
  return (
    <div className={`searchbar ${className}`}>
      <Search size={16} className="searchbar__icon" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {value && (
        <button className="searchbar__clear" onClick={() => onChange('')}>
          <X size={14} />
        </button>
      )}
    </div>
  );
}
