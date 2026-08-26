import './StatusBadge.css';

// Maps arbitrary status strings to a visual tone.
const TONE_MAP = {
  ACTIVE: 'sage', PUBLISHED: 'sage', APPROVED: 'sage', PAID: 'sage', COMPLETED: 'sage', GRADED: 'sage', SUCCESS: 'sage', PRESENT: 'sage',
  PENDING: 'amber', DRAFT: 'amber', PROCESSING: 'amber', SUBMITTED: 'amber', UNGRADED: 'amber',
  INACTIVE: 'slate', ARCHIVED: 'slate', CANCELLED: 'rose', REJECTED: 'rose', FAILED: 'rose', OVERDUE: 'rose',
};

export default function StatusBadge({ status, label }) {
  const tone = TONE_MAP[String(status).toUpperCase()] || 'slate';
  return <span className={`status-badge status-badge--${tone}`}>{label || status}</span>;
}
