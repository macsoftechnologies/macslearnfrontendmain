import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Eye, Pencil, Trash2, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import usePagination from '../../hooks/usePagination';
import useDebounce from '../../hooks/useDebounce';
import * as coursesApi from '../../api/courses';
import * as usersApi from '../../api/users';
import * as regionsApi from '../../api/regions';
import { extractErrorMessages, buildStaticUrl } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import SearchBar from '../../components/ui/SearchBar';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Modal from '../../components/ui/Modal';
import ActionMenu from '../../components/ui/ActionMenu';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
};

export default function Courses() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const debouncedSearch = useDebounce(search);
  const { items, page, setPage, meta, loading, refresh } = usePagination(coursesApi.list, { search: debouncedSearch, status: status || undefined });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewPricingCourse, setViewPricingCourse] = useState(null);
  const [facultyMap, setFacultyMap] = useState({});
  const [regionMap, setRegionMap] = useState({});

  useEffect(() => {


    usersApi.list({ limit: 500 }).then((res) => {
      const map = {};
      const users = res.data?.data || res.data || [];
      users.forEach((u) => { map[u._id || u.id] = u.fullName || u.email; });
      setFacultyMap(map);
    }).catch(() => {});

    regionsApi.list().then((res) => {
      const map = {};
      (res.data?.data || res.data || []).forEach((r) => { map[r._id || r.id] = r.name; });
      setRegionMap(map);
    }).catch(() => {});
  }, []);

  const doDelete = async () => {
    try {
      await coursesApi.remove(deleteTarget._id || deleteTarget.id);
      toast.success('Course deleted');
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Catalog</span>
          <h1 className="page-title">Courses</h1>
          <p className="page-subtitle">Create and manage courses in your school.</p>
        </div>
        <Link to="/admin/courses/create"><Button icon={Plus}>New Course</Button></Link>
      </div>

      <div className="row" style={{ marginBottom: 'var(--sp-4)' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search for Courses" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </Select>
      </div>

      <DataTable
        loading={loading}
        emptyLabel="No courses yet. Create your first course to get started."
        columns={[
          { 
            key: 'thumbnail', 
            header: 'Thumbnail', 
            width: '80px',
            render: (r) => (
              <div style={{ width: 52, height: 52, borderRadius: '50%', overflow: 'hidden', background: 'var(--color-paper-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--border-subtle)' }}>
                {r.thumbnailUrl ? (
                  <img 
                    src={buildStaticUrl(r.thumbnailUrl)} 
                    alt={r.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                ) : (
                  <BookOpen size={20} color="var(--text-secondary)" />
                )}
              </div>
            )
          },
          { 
            key: 'title', 
            header: 'Name',
            render: (r) => (
              <Link 
                to={`/admin/courses/${r._id || r.id}`} 
                style={{ color: 'var(--color-sky-500)', fontWeight: 500, textDecoration: 'none' }}
                onMouseEnter={e => e.target.style.textDecoration = 'underline'}
                onMouseLeave={e => e.target.style.textDecoration = 'none'}
              >
                {r.title}
              </Link>
            )
          },
          { 
            key: 'faculty', 
            header: 'Instructor(s)', 
            render: (r) => {
              const name = r.faculty?.fullName || r.instructor?.fullName || (r.instructorIds?.length > 0 ? r.instructorIds.map(i => (i && typeof i === 'object') ? (i.fullName || i.email || 'Unknown') : (facultyMap[i] || i)).filter(Boolean).join(', ') : '—');
              if (name === '—') return <span style={{ color: 'var(--text-muted)' }}>—</span>;
              return (
                <span style={{ 
                  background: 'var(--color-primary-50)', 
                  color: 'var(--color-primary-700)', 
                  padding: '4px 8px', 
                  borderRadius: '12px', 
                  fontSize: '12px', 
                  fontWeight: 600,
                  border: '1px solid var(--color-primary-200)',
                  display: 'inline-block'
                }}>
                  {name}
                </span>
              );
            }
          },
          { 
            key: 'createdAt', 
            header: 'Creation Date', 
            render: (r) => formatDate(r.createdAt) 
          },
          { 
            key: 'price', 
            header: 'Course Fee', 
            render: (r) => {
              const regionalList = r.regionalPrices || [];
              const hasRegional = regionalList.length > 0;
              const primaryReg = hasRegional ? regionalList[0] : null;
              const regPrice = primaryReg?.price ?? primaryReg?.amount;
              const currency = primaryReg?.currency || r.pricing?.currency || 'INR';

              if (regPrice || r.pricing?.amount) {
                const displayAmount = regPrice ?? r.pricing?.amount;
                return (
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {`${currency} ${displayAmount}`}
                    </div>
                    {regionalList.length > 1 && (
                      <div 
                        style={{ fontSize: '11px', color: 'var(--color-sky-500)', marginTop: '2px', cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={(e) => { e.stopPropagation(); setViewPricingCourse(r); }}
                      >
                        +{`${regionalList.length - 1} other region(s)`}
                      </div>
                    )}
                  </div>
                );
              }

              return <div style={{ color: 'var(--text-muted)' }}>Free</div>;
            }
          },
          { key: 'enrolledCount', header: 'Enrollments', render: (r) => r.enrolledCount ?? 0 },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          {
            key: 'actions', 
            header: 'Actions', 
            width: '60px',
            render: (r) => (
              <ActionMenu
                items={[
                  { label: 'View', icon: Eye, to: `/admin/courses/${r._id || r.id}` },
                  { label: 'Edit', icon: Pencil, to: `/admin/courses/${r._id || r.id}/edit` },
                  { separator: true },
                  { label: 'Delete', icon: Trash2, danger: true, onClick: () => setDeleteTarget(r) },
                ]}
              />
            ),
          },
        ]}
        rows={items}
      />

      <Pagination currentPage={page} totalPages={meta.totalPages} totalItems={meta.totalItems} onChange={setPage} />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={doDelete}
        title="Delete this course?"
        description={`"${deleteTarget?.title}" and all of its content will be permanently removed.`}
        confirmLabel="Delete Course"
      />

      <Modal open={!!viewPricingCourse} onClose={() => setViewPricingCourse(null)} title="Regional Pricing" width={400}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontWeight: 600, marginBottom: '8px' }}>{viewPricingCourse?.title}</div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
              <th style={{ padding: '8px 4px', fontSize: 'var(--fs-sm)' }}>Region</th>
              <th style={{ padding: '8px 4px', fontSize: 'var(--fs-sm)', textAlign: 'right' }}>Price</th>
            </tr>
          </thead>
          <tbody>
            {(viewPricingCourse?.regionalPrices || []).map((rp, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '8px 4px', fontSize: 'var(--fs-sm)' }}>{rp.regionId?.name || regionMap[rp.regionId] || 'Unknown'}</td>
                <td style={{ padding: '8px 4px', fontSize: 'var(--fs-sm)', textAlign: 'right' }}>{rp.currency || 'USD'} {rp.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="modal-panel__foot" style={{ margin: '24px -24px -24px', padding: '16px 24px', justifyContent: 'flex-end' }}>
          <Button variant="outline" onClick={() => setViewPricingCourse(null)}>Close</Button>
        </div>
      </Modal>
    </div>
  );
}
