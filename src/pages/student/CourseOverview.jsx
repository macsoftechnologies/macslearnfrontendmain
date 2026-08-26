import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Clock, BarChart2, User, PlayCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import * as coursesApi from '../../api/courses';
import * as contentApi from '../../api/content';
import * as enrollmentsApi from '../../api/enrollments';
import * as studentsApi from '../../api/students';
import { useAuth } from '../../contexts/AuthContext';
import client, { extractErrorMessages, buildStaticUrl } from '../../api/client';
import Button from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import PageLoader from '../../components/ui/PageLoader';
import Modal from '../../components/ui/Modal';

export default function CourseOverview() {
  const { id, programId: pathProgramId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const programId = pathProgramId || searchParams.get('programId');
  
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      coursesApi.getById(id), 
      contentApi.listModules(id).catch(() => ({ data: { data: [] } }))
    ]).then(([c, m]) => {
      if (c.status === 'fulfilled') setCourse(c.value.data?.data || null);
      if (m.status === 'fulfilled') setModules(m.value?.data?.data || []);
      
      const userId = user?.id || user?._id;
      if (userId) {
        studentsApi.getEnrollments(userId).then((eRes) => {
          const enrollmentsList = eRes.data?.data || [];
          const match = enrollmentsList.find(e => (e.courseId?._id || e.courseId?.id || e.courseId) === id);
          if (match) {
            const expired = match.status === 'EXPIRED' || (match.expiresAt && new Date(match.expiresAt) < new Date());
            setIsExpired(expired);
            setIsEnrolled(!expired);
          } else {
            setIsEnrolled(false);
            setIsExpired(false);
          }
          setLoading(false);
        }).catch(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
  }, [id, user]);

  const enroll = async () => {
    setEnrolling(true);
    try {
      if (programId) {
        await client.post(`/enrollments/student/programs/${programId}/enroll`, {
          selectedCourseIds: [id]
        });
      } else {
        await enrollmentsApi.studentEnroll(id);
      }
      toast.success(isExpired ? 'Course re-enrolled successfully!' : 'Enrollment successful!');
      setIsEnrolled(true);
      setIsExpired(false);
      setShowPaymentModal(false);
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    } finally {
      setEnrolling(false);
    }
  };

  const displayPrice = (() => {
    let finalAmount = null;
    let currency = 'USD';

    // 1. Check regional price
    if (user?.regionId && Array.isArray(course?.regionalPrices)) {
      const rp = course.regionalPrices.find(
        (rp) => rp.regionId?._id === user.regionId || rp.regionId === user.regionId
      );
      if (rp && rp.price !== undefined && rp.price !== null) {
        finalAmount = rp.price;
        currency = rp.currency || 'USD';
      }
    }

    // 2. Fallback to base price if no regional price is found
    if (finalAmount === null) {
      if (course?.pricing?.isPaid) {
        finalAmount = course.pricing.amount;
        currency = course.pricing.currency || 'USD';
      } else if (course?.price) {
        finalAmount = course.price;
      }
    }

    if (finalAmount === null || finalAmount === 0) return 'Free';
    return `${currency} ${Number(finalAmount).toFixed(2)}`;
  })();

  if (loading) return <PageLoader />;
  if (!course) return <div className="page"><p>Course not found.</p></div>;

  return (
    <div className="page">
      <Link 
        to={programId ? `/student/programs/${programId}` : location.state?.fromProgram ? `/student/programs/${location.state.fromProgram}` : "/student/courses"} 
        className="row text-muted" 
        style={{ marginBottom: 'var(--sp-4)', fontSize: 'var(--fs-xs)', fontWeight: 600 }}
      >
        <ArrowLeft size={14} /> Back to {programId || location.state?.fromProgram ? 'Program' : 'catalog'}
      </Link>

      {isExpired && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '16px 20px', borderRadius: '12px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ color: '#991b1b', margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700 }}>Course Access Expired</h4>
            <p style={{ color: '#b91c1c', margin: 0, fontSize: '14px' }}>The access period for this course is completed. You need to buy the course again to re-enroll and regain access.</p>
          </div>
          <Button variant="danger" size="md" onClick={() => setShowPaymentModal(true)} loading={enrolling}>
            Buy Course Again
          </Button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 'var(--sp-8)' }}>
        <div>
          <span className="page-eyebrow">Course</span>
          <h1 className="page-title" style={{ marginBottom: 'var(--sp-3)' }}>{course.title}</h1>
          {course.description ? (
            <div className="text-muted ql-editor" style={{ marginBottom: 'var(--sp-5)', lineHeight: 1.6, padding: 0, wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: course.description }} />
          ) : (
            <p className="text-muted" style={{ marginBottom: 'var(--sp-5)', lineHeight: 1.6 }}>No description provided.</p>
          )}

          <div className="row" style={{ gap: 'var(--sp-6)', marginBottom: 'var(--sp-8)', flexWrap: 'wrap' }}>
            <span className="row text-muted" style={{ fontSize: 'var(--fs-sm)' }}><User size={15} /> {course.faculty?.fullName || ' LMS'}</span>
            <span className="row text-muted" style={{ fontSize: 'var(--fs-sm)' }}><Clock size={15} /> {course.durationWeeks ? `${course.durationWeeks} weeks` : 'Self-paced'}</span>
            <span className="row text-muted" style={{ fontSize: 'var(--fs-sm)' }}><BarChart2 size={15} /> {course.level || 'All levels'}</span>
          </div>

          <h2 className="section-title">Syllabus</h2>
          <div className="stack">
            {modules.length === 0 ? (
              <p className="text-muted">Enroll to view the full syllabus.</p>
            ) : (
              modules.map((m, i) => (
                <Card key={m.id || m._id} style={{ padding: 'var(--sp-4)' }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <strong>{i + 1}. {m.title}</strong>
                  </div>
                  {m.description && <p className="text-muted" style={{ fontSize: 'var(--fs-sm)', marginTop: 6 }}>{m.description}</p>}
                </Card>
              ))
            )}
          </div>
        </div>

        <div>
          <Card style={{ padding: 0, overflow: 'hidden', position: 'sticky', top: 90 }}>
            <div style={{ height: 160, background: course.thumbnailUrl ? `url(${buildStaticUrl(course.thumbnailUrl)}) center/cover` : 'linear-gradient(135deg, var(--color-ink-800), var(--color-ink-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-amber-400)' }}>
              {!course.thumbnailUrl && <PlayCircle size={36} />}
            </div>
            <div style={{ padding: 'var(--sp-5)' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-2xl)', margin: '0 0 var(--sp-4) 0' }}>
                {displayPrice}
              </p>
              {isEnrolled ? (
                <Button full size="lg" onClick={() => navigate(`/student/my-courses/${id}/learn`)}>Go to Course</Button>
              ) : (
                <Button full size="lg" onClick={() => {
                  if (displayPrice !== 'Free') {
                    setShowPaymentModal(true);
                  } else {
                    enroll();
                  }
                }} loading={enrolling}>
                  {isExpired ? 'Buy Course Again' : displayPrice !== 'Free' ? 'Buy now' : 'Enroll Now'}
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Modal open={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Confirm Purchase">
        <div className="stack">
          <p>You are about to purchase the course <strong>{course.title}</strong>.</p>
          <div style={{ background: 'var(--color-paper-50)', padding: 'var(--sp-4)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Course Price:</span>
              <strong>{displayPrice}</strong>
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span>Total:</span>
              <strong style={{ color: 'var(--color-primary-600)', fontSize: '18px' }}>{displayPrice}</strong>
            </div>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--sp-3)', marginTop: 'var(--sp-2)' }}>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>Close</Button>
            <Button loading={enrolling} onClick={enroll}>Confirm & Buy Now</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
