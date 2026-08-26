import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Plus, Pencil } from 'lucide-react';
import usePagination from '../../hooks/usePagination';
import useDebounce from '../../hooks/useDebounce';
import * as coursesApi from '../../api/courses';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import SearchBar from '../../components/ui/SearchBar';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';

export default function FacultyCourses() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const debouncedSearch = useDebounce(search);
  const { items, page, setPage, meta, loading } = usePagination(coursesApi.list, { search: debouncedSearch, status: status || undefined });
  useEffect(() => {
  }, []);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Teaching</span>
          <h1 className="page-title">My Courses</h1>
          <p className="page-subtitle">Courses you are teaching — manage content, exams and assignments.</p>
        </div>
        <Link to="/faculty/courses/create"><Button icon={Plus}>Create Course</Button></Link>
      </div>

      <div className="row" style={{ marginBottom: 'var(--sp-4)' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search courses…" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </Select>
      </div>

      <DataTable
        loading={loading}
        emptyLabel="You haven't been assigned any courses yet."
        columns={[
          { key: 'title', header: 'Title' },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'price', header: 'Price', render: (r) => {
            const hasBasePrice = r.pricing?.isPaid || r.price;
            const hasRegional = r.regionalPrices?.length > 0;
            if (hasBasePrice) return r.pricing?.isPaid ? `${r.pricing.currency || 'USD'} ${r.pricing.amount}` : `$${r.price}`;
            if (hasRegional) return `${r.regionalPrices.length} Regional Price(s)`;
            return 'Free';
          }},
          { key: 'enrolledCount', header: 'Students', render: (r) => r.enrolledCount ?? 0 },
          {
            key: 'actions', header: 'Actions', render: (r) => (
              <div className="row" style={{ gap: 6 }}>
                <Link to={`/faculty/courses/${r._id || r.id}`}><Button size="sm" variant="ghost" icon={Eye}>Manage</Button></Link>
                <Link to={`/faculty/courses/${r._id || r.id}/edit`}><Button size="sm" variant="outline" icon={Pencil}>Edit</Button></Link>
              </div>
            ),
          },
        ]}
        rows={items}
      />

      <Pagination currentPage={page} totalPages={meta.totalPages} totalItems={meta.totalItems} onChange={setPage} />
    </div>
  );
}
