import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plus, Eye, Pencil, Unlink, ArrowLeft, Link as LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import usePagination from '../../../hooks/usePagination';
import useDebounce from '../../../hooks/useDebounce';
import * as coursesApi from '../../../api/courses';
import * as usersApi from '../../../api/users';
import * as regionsApi from '../../../api/regions';
import * as semestersApi from '../../../api/semesters';
import * as programsApi from '../../../api/programs';
import { extractErrorMessages } from '../../../api/client';
import DataTable from '../../../components/ui/DataTable';
import Pagination from '../../../components/ui/Pagination';
import SearchBar from '../../../components/ui/SearchBar';
import StatusBadge from '../../../components/ui/StatusBadge';
import Button from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Input';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import Modal from '../../../components/ui/Modal';

export default function SemesterDetail() {
  const { programId, id: semesterId } = useParams();
  const [program, setProgram] = useState(null);
  const [semester, setSemester] = useState(null);

  // Link state
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [globalCourses, setGlobalCourses] = useState([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [isLinking, setIsLinking] = useState(false);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const debouncedSearch = useDebounce(search);
  
  const { items, page, setPage, meta, loading, refresh } = usePagination(coursesApi.list, { 
    search: debouncedSearch, 
    status: status || undefined,
    programId,
    semesterId
  });
  
  const [unlinkTarget, setUnlinkTarget] = useState(null);
  const [viewPricingCourse, setViewPricingCourse] = useState(null);
  const [facultyMap, setFacultyMap] = useState({});
  const [regionMap, setRegionMap] = useState({});

  useEffect(() => {
    programsApi.getById(programId).then(res => setProgram(res.data || res)).catch(() => {});
    semestersApi.getById(semesterId).then(res => setSemester(res.data || res)).catch(() => {});

    usersApi.list({ userType: 'FACULTY', limit: 500 }).then((res) => {
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
  }, [programId, semesterId]);

  const fetchGlobalCourses = async () => {
    try {
      // Fetch all courses in the organization without filtering by semester
      const res = await coursesApi.list({ limit: 500 });
      setGlobalCourses(res.data?.data || []);
    } catch (err) {
      toast.error('Failed to load global course catalog');
    }
  };

  const doUnlink = async () => {
    try {
      await semestersApi.unlinkCourse(semesterId, unlinkTarget._id || unlinkTarget.id, programId);
      toast.success('Course removed from semester');
      setUnlinkTarget(null);
      refresh();
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    }
  };

  const openLinkModal = () => {
    fetchGlobalCourses();
    setSelectedCourseIds([]);
    setLinkModalOpen(true);
  };

  const toggleCourseSelection = (courseId) => {
    setSelectedCourseIds(prev => 
      prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
    );
  };

  const saveLinkedCourses = async () => {
    if (selectedCourseIds.length === 0) {
      toast.error('Please select at least one course.');
      return;
    }

    setIsLinking(true);
    try {
      const promises = selectedCourseIds.map(courseId => {
        return semestersApi.linkCourse(semesterId, courseId, programId);
      });
      await Promise.all(promises);
      toast.success(`Successfully linked ${selectedCourseIds.length} courses!`);
      setLinkModalOpen(false);
      refresh();
    } catch (err) {
      extractErrorMessages(err).forEach(m => toast.error(m));
    } finally {
      setIsLinking(false);
    }
  };

  if (!program || !semester) return <div className="page">Loading...</div>;

  return (
    <div className="page">
      <div style={{ marginBottom: '1rem' }}>
        <Link to={`/admin/programs/${programId}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Back to {program.name}
        </Link>
      </div>

      <div className="page-head">
        <div>
          <span className="page-eyebrow">{program.name}</span>
          <h1 className="page-title">{semester.name}</h1>
          <p className="page-subtitle">Manage courses for this semester.</p>
        </div>
        <div className="row">
          <Button variant="outline" icon={LinkIcon} onClick={openLinkModal}>Link Existing Courses</Button>
          <Link to={`/admin/courses`}>
            <Button icon={Plus}>Course Catalog</Button>
          </Link>
        </div>
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
        emptyLabel="No courses found in this semester. Link an existing one to get started."
        columns={[
          { key: 'title', header: 'Course Title' },
          { key: 'faculty', header: 'Faculty', render: (r) => r.faculty?.fullName || r.instructor?.fullName || (r.instructorIds?.length > 0 ? r.instructorIds.map(i => (i && typeof i === 'object') ? (i.fullName || i.email || 'Unknown') : (facultyMap[i] || i)).filter(Boolean).join(', ') : '—') },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          {
            key: 'actions', header: 'Actions', render: (r) => (
              <div className="row" style={{ gap: 6 }}>
                <Link to={`/admin/courses/${r._id || r.id}`}><Button size="sm" variant="ghost" icon={Eye}>View</Button></Link>
                <Link to={`/admin/courses/${r._id || r.id}/edit`}><Button size="sm" variant="outline" icon={Pencil}>Edit</Button></Link>
                <Button size="sm" variant="danger" icon={Unlink} onClick={() => setUnlinkTarget(r)}>Remove</Button>
              </div>
            ),
          },
        ]}
        rows={items}
      />

      <Pagination currentPage={page} totalPages={meta.totalPages} totalItems={meta.totalItems} onChange={setPage} />

      <ConfirmDialog
        open={!!unlinkTarget}
        onClose={() => setUnlinkTarget(null)}
        onConfirm={doUnlink}
        title="Remove this course?"
        description={`"${unlinkTarget?.title}" will be removed from this semester, but it will remain in your Master Course Catalog.`}
        confirmLabel="Remove from Semester"
      />

      <Modal open={linkModalOpen} onClose={() => !isLinking && setLinkModalOpen(false)} title={`Link Courses to ${semester.name}`} width={1000} position="right">
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: 'var(--fs-sm)' }}>
            Select courses from your master catalog to include in this semester.
          </p>
          
          <div style={{ flex: 1 }}>
            {globalCourses.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px dashed var(--border-subtle)' }}>
                No courses found in the catalog. Go to Course Catalog to create one!
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                {globalCourses.map((c) => {
                  const cId = c._id || c.id;
                  const isSelected = selectedCourseIds.includes(cId);
                  const isAlreadyInSemester = items.some(item => (item._id || item.id) === cId);
                  
                  return (
                    <div 
                      key={cId}
                      onClick={() => !isAlreadyInSemester && toggleCourseSelection(cId)}
                      style={{ 
                        cursor: isAlreadyInSemester ? 'not-allowed' : 'pointer',
                        background: isAlreadyInSemester ? 'var(--bg-app)' : (isSelected ? 'var(--color-primary-50)' : 'var(--bg-surface)'),
                        border: `1px solid ${isSelected ? 'var(--color-primary-400)' : 'var(--border-subtle)'}`,
                        borderRadius: '12px',
                        padding: '16px',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        opacity: isAlreadyInSemester ? 0.6 : 1,
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? '0 0 0 1px var(--color-primary-400)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <input
                          type="checkbox"
                          checked={isSelected || isAlreadyInSemester}
                          disabled={isAlreadyInSemester}
                          onChange={() => {}}
                          style={{ cursor: isAlreadyInSemester ? 'not-allowed' : 'pointer', width: '18px', height: '18px', marginTop: '2px' }}
                        />
                        <StatusBadge status={c.status} />
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>{c.title}</h4>
                        {isAlreadyInSemester && (
                          <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--color-success-600)', background: 'var(--color-success-50)', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>
                            Already linked
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="modal-panel__foot" style={{ marginTop: 'auto', borderTop: 'none', padding: '24px 0 0' }}>
            <Button variant="outline" onClick={() => setLinkModalOpen(false)} disabled={isLinking}>Cancel</Button>
            <Button onClick={saveLinkedCourses} loading={isLinking} disabled={selectedCourseIds.length === 0}>Link Selected Courses</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
