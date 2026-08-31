import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ArrowRight } from 'lucide-react';
import * as programsApi from '../../api/programs';
import * as studentsApi from '../../api/students';
import { useAuth } from '../../contexts/AuthContext';
import { buildStaticUrl } from '../../api/client';
import SearchBar from '../../components/ui/SearchBar';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import PageLoader from '../../components/ui/PageLoader';

export default function BrowsePrograms() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assignedPrograms, setAssignedPrograms] = useState([]);

  useEffect(() => {
    // If the student user object has a direct programId assigned, navigate directly
    if (user?.programId) {
      navigate(`/student/programs/${user.programId}`, { replace: true });
      return;
    }

    const userId = user?.id || user?._id;
    if (!userId) {
      setLoading(false);
      return;
    }

    // Fetch student's active enrollments to find their assigned degree program(s)
    Promise.all([
      studentsApi.getEnrollments(userId).catch(() => ({ data: { data: [] } })),
      programsApi.list({ status: 'PUBLISHED' }).catch(() => ({ data: { data: [] } }))
    ]).then(([enrollRes, progsRes]) => {
      const enrollList = enrollRes.data?.data || [];
      const allProgs = progsRes.data?.data || [];

      // Extract unique assigned program IDs from student enrollments
      const enrolledProgramIds = [
        ...new Set(
          enrollList
            .map((e) => e.programId || e.program?.id || e.program_id)
            .filter(Boolean)
        )
      ];

      // Match with full program details
      const matched = allProgs.filter((p) => enrolledProgramIds.includes(p.id || p._id));

      // If student has exactly 1 assigned program, redirect directly into the curriculum
      if (matched.length === 1) {
        navigate(`/student/programs/${matched[0].id || matched[0]._id}`, { replace: true });
        return;
      }

      setAssignedPrograms(matched);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [user, navigate]);

  const filteredPrograms = assignedPrograms.filter((p) =>
    (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.degreeTitle || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Curriculum</span>
          <h1 className="page-title">My Program</h1>
          <p className="page-subtitle">Your assigned degree programs and curriculum.</p>
        </div>
      </div>

      {assignedPrograms.length > 1 && (
        <div className="row" style={{ marginBottom: 'var(--sp-6)' }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search your programs…" />
        </div>
      )}

      {loading ? (
        <PageLoader />
      ) : filteredPrograms.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No Degree Programs Assigned"
          description="You do not have any degree programs assigned to your student account yet. Please contact your institution administrator."
        />
      ) : (
        <div className="course-grid">
          {filteredPrograms.map((p) => (
            <div
              key={p.id || p._id}
              className="course-card"
              onClick={() => navigate(`/student/programs/${p.id || p._id}`)}
              style={{ cursor: 'pointer' }}
            >
              <div
                className="course-card__thumb"
                style={{
                  backgroundImage: (p.thumbnailUrl || p.thumbnail) ? `url('${buildStaticUrl(p.thumbnailUrl || p.thumbnail)}')` : undefined,
                  backgroundColor: 'var(--brand-surface)'
                }}
              >
                {!(p.thumbnailUrl || p.thumbnail) && <GraduationCap size={48} color="var(--brand)" />}
              </div>
              <div className="course-card__body">
                <h3>{p.name}</h3>
                <div className="course-card__meta">
                  <span>{p.totalSubjects} Subjects</span>
                  <span>
                    {p.maxDurationYears ? `${p.maxDurationYears} Years` : (p.totalSemesters ? `${Math.ceil(p.totalSemesters / 2)} Years` : '3 Years')}
                  </span>
                </div>
                <div style={{ marginTop: 'var(--sp-3)' }}>
                  <Button
                    full
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/student/programs/${p.id || p._id}`);
                    }}
                  >
                    View Curriculum <ArrowRight size={14} style={{ marginLeft: 6 }} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
