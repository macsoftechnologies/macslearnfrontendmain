import { Inbox } from 'lucide-react';
import './DataTable.css';

/**
 * columns: [{ key, header, render?(row), width? }]
 */
export default function DataTable({ columns, rows, loading, emptyLabel = 'Nothing here yet', rowKey = 'id', footerRow }) {
  const safeRows = Array.isArray(rows) ? rows : [];
  return (
    <div className="dtable-wrap">
      <table className="dtable">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ width: c.width, textAlign: c.align || 'left' }}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading &&
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={`sk-${i}`} className="dtable__skeleton-row">
                {columns.map((c) => (
                  <td key={c.key}>
                    <span className="skeleton-bar" />
                  </td>
                ))}
              </tr>
            ))}

          {!loading && safeRows.length === 0 && (
            <tr>
              <td colSpan={columns.length}>
                <div className="dtable__empty">
                  <Inbox size={28} strokeWidth={1.5} />
                  <p>{emptyLabel}</p>
                </div>
              </td>
            </tr>
          )}

          {!loading &&
            safeRows.map((row, index) => (
              <tr key={row[rowKey] || row._id || index}>
                {columns.map((c) => (
                  <td key={c.key} style={{ textAlign: c.align || 'left' }}>{c.render ? c.render(row) : row[c.key]}</td>
                ))}
              </tr>
            ))}
        </tbody>
        {footerRow && !loading && safeRows.length > 0 && (
          <tfoot>
            <tr className="dtable-footer-row">
              {columns.map((c) => (
                <td key={c.key} style={{ textAlign: c.align || 'left', fontWeight: 700, padding: '16px 20px' }}>
                  {footerRow[c.key] !== undefined ? footerRow[c.key] : ''}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
