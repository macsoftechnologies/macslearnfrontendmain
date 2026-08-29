import { Link } from 'react-router-dom';
import { Library, Folder, BookOpen, Clock, PlayCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import * as studentsApi from '../../api/students';
import { useAuth } from '../../contexts/AuthContext';
import { buildStaticUrl } from '../../api/client';
import EmptyState from '../../components/ui/EmptyState';
import PageLoader from '../../components/ui/PageLoader';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import * as transcriptsApi from '../../api/transcripts';
import { FileDown } from 'lucide-react';
import './CourseGrid.css';

export default function MyCourses() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = user?.id || user?._id;
    if (!id) return;
    studentsApi.getEnrollments(id)
      .then((res) => {
        const data = res.data?.data || res.data;
        setEnrollments(Array.isArray(data) ? data : (data?.enrollments || []));
      })
      .finally(() => setLoading(false));
  }, [user]);

  const handleDownloadTranscript = async (programId, programName) => {
    const id = user?.id || user?._id;
    const toastId = toast.loading('Generating transcript...');
    try {
      const blob = await transcriptsApi.generate(id);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transcript-${programName}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('Transcript downloaded', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to download transcript', { id: toastId });
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Learning</span>
          <h1 className="page-title">My Courses</h1>
          <p className="page-subtitle">Everything you're enrolled in.</p>
        </div>
      </div>

      {enrollments.length === 0 ? (
        <EmptyState 
          icon={Library} 
          title="No courses yet" 
          description="Browse your program curriculum and enroll in your first semester subjects." 
          action={
            <Link to={user?.programId ? `/student/programs/${user.programId}` : "/student/programs"}>
              <Button size="sm">Browse Curriculum & Enroll</Button>
            </Link>
          } 
        />
      ) : (
        <div className="course-grid">
          {enrollments.map((e) => {
            const courseObj = (typeof e.courseId === 'object' && e.courseId !== null) ? e.courseId : (e.course || {});
            const thumb = courseObj.thumbnailUrl || courseObj.thumbnail || e.thumbnailUrl;
            const title = courseObj.title || e.courseTitle || 'Course';
            const courseId = courseObj.id || courseObj._id || e.courseId;

            return (
              <Link 
                to={e.status === 'EXPIRED' ? '#' : `/student/my-courses/${courseId}/learn`} 
                key={e._id || e.id} 
                className="course-card" 
                style={e.status === 'EXPIRED' ? { opacity: 0.7 } : {}}
              >
                <div 
                  className="course-card__thumb" 
                  style={{ 
                    aspectRatio: '16/9', 
                    backgroundColor: '#0f172a', 
                    position: 'relative', 
                    overflow: 'hidden', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}
                >
                  {thumb ? (
                    <img 
                      src={buildStaticUrl(thumb)} 
                      alt={title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: 'center',
                        display: 'block'
                      }}
                    />
                  ) : (
                    <Library size={36} color="#a5b4fc" />
                  )}
                  {e.status === 'EXPIRED' && (
                    <span style={{ position: 'absolute', top: 8, right: 8, background: 'var(--danger, #ef4444)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                      Expired
                    </span>
                  )}
                </div>
                <div className="course-card__body">
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 6px', color: 'var(--text-primary)' }}>{title}</h3>
                  {e.expiresAt && <p className="text-muted" style={{ fontSize: 'var(--fs-xs)', marginBottom: 'var(--sp-2)' }}>Expires: {new Date(e.expiresAt).toLocaleDateString()}</p>}
                  <div className="course-card__progress">
                    <div className="course-card__progress-bar"><span style={{ width: `${e.progressPercentage || 0}%` }} /></div>
                    <span className="text-muted" style={{ fontSize: 'var(--fs-2xs)', fontWeight: 600 }}>{e.progressPercentage || 0}% complete</span>
                  </div>
                  {e.grade && (
                    <div style={{ marginTop: 'var(--sp-2)' }}>
                      <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--color-primary-600)', background: 'var(--color-primary-50)', padding: '2px 6px', borderRadius: 4 }}>
                        Grade: {e.grade.grade} ({e.grade.totalScore})
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
