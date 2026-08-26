import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import usePagination from '../../hooks/usePagination';
import useDebounce from '../../hooks/useDebounce';
import * as programsApi from '../../api/programs';
import * as studentsApi from '../../api/students';
import { useAuth } from '../../contexts/AuthContext';
import { buildStaticUrl } from '../../api/client';
import SearchBar from '../../components/ui/SearchBar';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import PageLoader from '../../components/ui/PageLoader';

export default function BrowsePrograms() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { user } = useAuth();
  const debouncedSearch = useDebounce(search);
  const [enrolledProgramIds, setEnrolledProgramIds] = useState([]);

  useEffect(() => {
    const userId = user?.id || user?._id;
    if (userId) {
      studentsApi.getEnrollments(userId).then(res => {
        const list = res.data?.data || [];
        const programIds = list.map(e => e.programId).filter(Boolean);
        setEnrolledProgramIds([...new Set(programIds)]);
      }).catch(() => {});
    }
  }, [user]);

  const { items, page, setPage, meta, loading } = usePagination(
    programsApi.list, // Assuming list can take search params in future, or we just filter client-side if it doesn't support pagination
    { search: debouncedSearch, status: 'PUBLISHED' },
    12
  );

  // Since programsApi.list might not be paginated, we handle it client side for now if meta is missing
  const programsToDisplay = items.length > 0 ? items : (meta?.totalItems ? [] : items);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">University</span>
          <h1 className="page-title">Browse Programs</h1>
          <p className="page-subtitle">Find your next degree.</p>
        </div>
      </div>

      <div className="row" style={{ marginBottom: 'var(--sp-6)' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search programs…" />
      </div>

      {loading ? (
        <PageLoader />
      ) : programsToDisplay.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No programs found" description="Try a different search." />
      ) : (
        <div className="course-grid">
          {programsToDisplay.map((p) => (
            <div key={p.id} className="course-card" onClick={() => navigate(`/student/programs/${p.id}`)} style={{ cursor: 'pointer' }}>
              <div className="course-card__thumb" style={{ backgroundImage: (p.thumbnailUrl || p.thumbnail) ? `url('${buildStaticUrl(p.thumbnailUrl || p.thumbnail)}')` : undefined, backgroundColor: 'var(--brand-surface)' }}>
                {!(p.thumbnailUrl || p.thumbnail) && <GraduationCap size={48} color="var(--brand)" />}
              </div>
              <div className="course-card__body">
                <h3>{p.name}</h3>
                <div className="course-card__meta">
                  <span>{p.totalSubjects} Subjects</span>
                  {p.totalSemesters > 0 && <span>{p.totalSemesters} Semesters</span>}
                </div>
                <div style={{ marginTop: 'var(--sp-3)' }}>
                  {enrolledProgramIds.includes(p.id) ? (
                    <Button 
                      full 
                      size="sm" 
                      onClick={(e) => { e.stopPropagation(); navigate(`/student/programs/${p.id}`); }}
                    >
                      View Program
                    </Button>
                  ) : (
                    <Button 
                      full 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); navigate(`/student/programs/${p.id}`); }}
                    >
                      Preview Program
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
