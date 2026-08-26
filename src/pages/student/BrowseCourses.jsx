import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Library, BookOpen } from 'lucide-react';
import usePagination from '../../hooks/usePagination';
import useDebounce from '../../hooks/useDebounce';
import * as coursesApi from '../../api/courses';
import * as studentsApi from '../../api/students';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect } from 'react';
import SearchBar from '../../components/ui/SearchBar';
import Button from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import PageLoader from '../../components/ui/PageLoader';
import { buildStaticUrl } from '../../api/client';
import './CourseGrid.css';

export default function BrowseCourses() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { user } = useAuth();
  const debouncedSearch = useDebounce(search);
  const [enrolledIds, setEnrolledIds] = useState([]);

  useEffect(() => {
    const userId = user?.id || user?._id;
    if (userId) {
      studentsApi.getEnrollments(userId).then(res => {
        const list = res.data?.data || [];
        setEnrolledIds(list.map(e => e.courseId?._id || e.courseId?.id || e.courseId));
      }).catch(() => {});
    }
  }, [user]);

  const { items, page, setPage, meta, loading } = usePagination(
    coursesApi.list,
    { search: debouncedSearch, status: 'PUBLISHED' },
    12
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Catalog</span>
          <h1 className="page-title">Browse Courses</h1>
          <p className="page-subtitle">Find your next course.</p>
        </div>
      </div>

      <div className="row" style={{ marginBottom: 'var(--sp-6)' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search courses…" />
      </div>

      {loading ? (
        <PageLoader />
      ) : items.length === 0 ? (
        <EmptyState icon={Library} title="No courses found" description="Try a different search or category." />
      ) : (
        <div className="course-grid">
          {items.map((c) => (
            <div key={c._id || c.id} className="course-card" onClick={() => navigate(`/student/courses/${c._id || c.id}`)} style={{ cursor: 'pointer' }}>
              <div className="course-card__thumb" style={{ backgroundImage: (c.thumbnailUrl || c.thumbnail) ? `url('${buildStaticUrl(c.thumbnailUrl || c.thumbnail)}')` : undefined, backgroundColor: 'var(--brand-surface)' }}>
                {!(c.thumbnailUrl || c.thumbnail) && <BookOpen size={48} color="var(--brand)" />}
              </div>
              <div className="course-card__body">
                <h3>{c.title}</h3>
                <div className="course-card__meta">
                  <div className="row" style={{ gap: 'var(--sp-2)', fontSize: 'var(--fs-xs)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{c.credits || 0} Credits</span>
                    <span style={{ color: 'var(--border)' }}>|</span>
                    <span style={{ color: 'var(--color-primary-600)' }}>0 Exams</span>
                  </div>
                  <span className="course-card__price">
                    {(() => {
                      let displayPrice = 'Free';
                      let amount = null;
                      let currency = 'USD';
                      
                      if (user?.regionId && Array.isArray(c.regionalPrices)) {
                        const override = c.regionalPrices.find(rp => rp.regionId === user.regionId || rp.regionId?._id === user.regionId);
                        if (override && override.price !== undefined && override.price !== null) {
                          amount = override.price;
                          currency = override.currency || 'USD';
                        }
                      }
                      
                      if (amount === null) {
                        if (c.pricing?.isPaid) {
                          amount = c.pricing.amount;
                          currency = c.pricing.currency || 'USD';
                        } else if (c.price) {
                          amount = c.price;
                        }
                      }
                      
                      if (amount !== null && amount > 0) {
                        displayPrice = `${currency} ${Number(amount).toFixed(2)}`;
                      }
                      
                      return displayPrice;
                    })()}
                  </span>
                </div>
                <div style={{ marginTop: 'var(--sp-3)' }}>
                  {enrolledIds.includes(c._id || c.id) ? (
                    <Button 
                      full 
                      size="sm" 
                      onClick={(e) => { e.stopPropagation(); navigate(`/student/my-courses/${c._id || c.id}/learn`); }}
                    >
                      Go to Course
                    </Button>
                  ) : (
                    <Button 
                      full 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); navigate(`/student/courses/${c._id || c.id}`); }}
                    >
                      Preview Course
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination currentPage={page} totalPages={meta.totalPages} totalItems={meta.totalItems} onChange={setPage} />
    </div>
  );
}
