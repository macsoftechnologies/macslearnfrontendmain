import { ChevronLeft, ChevronRight } from 'lucide-react';
import './Pagination.css';

export default function Pagination({ currentPage = 1, totalPages = 1, totalItems, limit, onChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, currentPage - 1);
  const end = Math.min(totalPages, start + 2);
  for (let p = start; p <= end; p++) pages.push(p);

  return (
    <div className="pagination">
      <span className="pagination__count">
        {totalItems != null ? `${totalItems} total` : `Page ${currentPage} of ${totalPages}`}
      </span>
      <div className="pagination__controls">
        <button disabled={currentPage <= 1} onClick={() => onChange(currentPage - 1)} className="pagination__btn">
          <ChevronLeft size={16} />
        </button>
        {start > 1 && <span className="pagination__ellipsis">…</span>}
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`pagination__btn ${p === currentPage ? 'pagination__btn--active' : ''}`}
          >
            {p}
          </button>
        ))}
        {end < totalPages && <span className="pagination__ellipsis">…</span>}
        <button disabled={currentPage >= totalPages} onClick={() => onChange(currentPage + 1)} className="pagination__btn">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
